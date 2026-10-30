// Photographs every screen at several screen sizes into screenshots/ (wiped first, so only the latest set is kept),
// plus screenshots/index.html to look through them. Needs the game server running: `npm run dev:server`.
// Usage: npm run screenshots
import { rm, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const SERVER = "http://localhost:8787";
const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const OUT = new URL("../screenshots/", import.meta.url).pathname;

/** [folder, width, height] */
const SIZES = [
  ["1-small-phone", 320, 568],
  ["2-phone", 360, 740],
  ["3-iphone", 390, 844],
  ["4-big-phone", 430, 932],
  ["5-sideways", 844, 390],
  ["6-tablet", 768, 1024],
  ["7-desktop", 1280, 800],
];
/** Fixed popups only cover the visible screen, so popups are shot at screen size; the rest as the full page. */
const VISIBLE_ONLY = /popup|settings|qr|connection-lost|toast|reconnecting/;

try {
  await fetch(SERVER);
} catch {
  console.error(`The game server isn't running at ${SERVER}. Start it first: npm run dev:server`);
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
for (const [folder] of SIZES) await mkdir(OUT + folder, { recursive: true });

const vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await vite.listen();
const browser = await chromium.launch();
const errors = [];
const shots = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function page() {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on("pageerror", (e) => errors.push(String(e)));
  return p;
}

async function shoot(p, name) {
  for (const [folder, width, height] of SIZES) {
    await p.setViewportSize({ width, height });
    await wait(120);
    await p.screenshot({ path: `${OUT}${folder}/${name}.png`, fullPage: !VISIBLE_ONLY.test(name) });
  }
  await p.setViewportSize({ width: 390, height: 844 });
  shots.push(name);
  console.log("  ", name);
}

const board = (p) => p.getByRole("group", { name: "Board" });

/** Plays a match to a win for whoever moves first: top row for seat 0. */
async function playToWin(players) {
  for (const cell of [0, 1, 3, 2, 6, 5, 7, 8]) {
    let moved = false;
    for (const p of players) {
      if (!(await board(p).count())) continue;
      const button = board(p).getByRole("button").nth(cell);
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        moved = true;
        break;
      }
    }
    await wait(350);
    if (!moved) break;
  }
}

try {
  // Home, then servers full (the server's answer faked).
  const home = await page();
  await home.goto(BASE);
  await wait(500);
  await shoot(home, "01-home");
  await home.route("**/api/rooms", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "SERVERS_FULL", resetAt: new Date(Date.now() + 5 * 3600e3).toISOString() }),
    }),
  );
  await home.getByRole("button", { name: /create room/i }).click();
  await wait(600);
  await shoot(home, "02-servers-full");
  await home.close();

  // A room code that doesn't exist.
  const missing = await page();
  await missing.goto(BASE + "?room=412345");
  await missing.getByRole("button", { name: /join room/i }).click();
  await wait(1500);
  await shoot(missing, "03-error");
  await missing.close();

  // The host's socket goes through Playwright, so we can drop it or slip in a message.
  const host = await page();
  let blockHost = false;
  let hostSocket = null;
  await host.routeWebSocket(/\/api\/rooms\//, (ws) => {
    if (blockHost) return void ws.close({ code: 1011 });
    ws.connectToServer();
    hostSocket = ws;
  });
  await host.goto(BASE);
  await host.getByRole("button", { name: /create room/i }).click();
  await wait(1500);
  await shoot(host, "04-room-alone");
  const code = new URL(host.url()).searchParams.get("room");

  // Joining: the server never answers.
  const joining = await page();
  await joining.routeWebSocket(/\/api\/rooms\//, () => {});
  await joining.goto(BASE + "?room=" + code);
  await shoot(joining, "05-home-with-code");
  await joining.getByRole("button", { name: /join room/i }).click();
  await wait(800);
  await shoot(joining, "06-joining");
  await joining.close();

  // Two friends join; one suggests the game.
  const pages = [host];
  for (let i = 0; i < 2; i++) {
    const guest = await page();
    await guest.goto(BASE + "?room=" + code);
    await guest.getByRole("button", { name: /join room/i }).click();
    await wait(1000);
    pages.push(guest);
  }
  await pages[1].getByRole("button", { name: /tic/i }).click();
  await wait(500);
  await shoot(host, "07-room-host");
  await shoot(pages[1], "08-room-guest");
  await host.getByRole("button", { name: "Settings" }).click();
  await wait(400);
  await shoot(host, "09-settings-popup");
  await host.getByRole("button", { name: "CLOSE" }).click();
  await host.getByRole("button", { name: /show qr/i }).click();
  await wait(400);
  await shoot(host, "10-qr-popup");
  await host.getByRole("button", { name: "CLOSE" }).click();

  // Round 1: two play, one sits out.
  await host.getByRole("button", { name: /tic/i }).click();
  await wait(1200);
  const split = async () => {
    const players = [];
    let bye = null;
    for (const p of pages) {
      if (await board(p).count()) players.push(p);
      else bye = p;
    }
    return { players, bye };
  };
  let { players, bye } = await split();
  for (const p of players) {
    const centre = board(p).getByRole("button").nth(4);
    if (await centre.isEnabled()) {
      await centre.click();
      break;
    }
  }
  await wait(500);
  await shoot(players[0], "11-match");
  hostSocket.send(JSON.stringify({ type: "error", error: "NOT_YOUR_TURN" }));
  await wait(300);
  await shoot(host, "12-toast");
  await players[0].getByRole("button", { name: "Quit match" }).click();
  await wait(400);
  await shoot(players[0], "13-quit-popup");
  await players[0].getByRole("button", { name: "KEEP PLAYING" }).click();
  await shoot(bye, "14-points");
  await bye.getByRole("button", { name: /^Watch/ }).first().click();
  await wait(600);
  await shoot(bye, "15-watching");
  await bye.getByRole("button", { name: "BACK TO SCORES", exact: true }).click();
  await wait(400);
  await bye.getByRole("button", { name: /leave room|back/i }).first().click();
  await wait(400);
  await shoot(bye, "16-leave-popup");
  await bye.getByRole("button", { name: "STAY" }).click();

  // Round 2's intro (its countdown runs about 3 s), then round 2 and the results.
  await playToWin(players);
  await wait(4600);
  await Promise.all(pages.slice(0, 2).map((p, i) => shoot(p, `17-round-intro-${i + 1}`)));
  await wait(3500);
  ({ players } = await split());
  await playToWin(players);
  await wait(5500);
  await shoot(host, "18-results-host");
  await shoot(pages[1], "19-results-guest");

  // The host's connection drops: reconnecting, then lost.
  blockHost = true;
  hostSocket.close({ code: 1011 });
  await wait(300);
  await shoot(host, "20-reconnecting");
  await wait(17000);
  await shoot(host, "21-connection-lost");

  // Match endings, held still on the dev preview page.
  for (const outcome of ["WIN", "LOSE", "DRAW"]) {
    const p = await page();
    await p.goto(BASE + "?preview=celebrations");
    await p.getByRole("button", { name: outcome, exact: true }).click();
    await wait(2500);
    await shoot(p, `22-ending-${outcome.toLowerCase()}`);
    await p.close();
  }

  // A full room where most friends suggest the same game: the tile shows a few avatars, then "+n".
  const busyHost = await page();
  await busyHost.goto(BASE);
  await busyHost.getByRole("button", { name: /create room/i }).click();
  await wait(1500);
  const busyCode = new URL(busyHost.url()).searchParams.get("room");
  for (let i = 0; i < 5; i++) {
    const guest = await page();
    await guest.goto(BASE + "?room=" + busyCode);
    await guest.getByRole("button", { name: /join room/i }).click();
    await wait(1000);
    await guest.getByRole("button", { name: /tic/i }).click();
    await wait(300);
    if (i === 4) await shoot(guest, "24-room-many-votes-guest");
  }
  await shoot(busyHost, "23-room-many-votes-host");
} finally {
  await browser.close();
  await vite.close();
}

// A page to look through them: one row per screen, every size side by side.
const rows = shots
  .map(
    (name) => `<section><h2>${name}</h2><div class="row">${SIZES.map(
      ([folder, w, h]) => `<figure><img src="${folder}/${name}.png" loading="lazy"><figcaption>${folder.slice(2)} ${w}×${h}</figcaption></figure>`,
    ).join("")}</div></section>`,
  )
  .join("\n");
await writeFile(
  OUT + "index.html",
  `<!doctype html><meta charset="utf-8"><title>Locade Games screenshots</title>
<style>body{font-family:system-ui;margin:16px;background:#eee}h2{font-size:16px;margin:24px 0 8px}
.row{display:flex;gap:12px;overflow-x:auto;align-items:flex-start}figure{margin:0}
img{height:420px;border:1px solid #999;background:#fff}figcaption{font-size:12px;color:#555}</style>
<h1>Every screen, ${new Date().toLocaleString()}</h1>
${rows}`,
);

console.log(errors.length ? "Page errors:\n" + errors.join("\n") : `Done: ${shots.length} screens × ${SIZES.length} sizes in screenshots/ (open screenshots/index.html)`);
