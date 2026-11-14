// Photographs every screen at a few screen sizes into screenshots/<part>/<size>/, plus screenshots/index.html to look
// through them. A part is the platform (home, the room with every game's tile, settings, the tournament's screens,
// connection troubles) or one game (only its own screens), so after a change only that part is shot again; the
// others stay as they were. Parts play side by side, each in its own room, like the playtests.
// Needs the game server: `npm run dev:server`.
// Usage: npm run screenshots                     everything
//        npm run screenshots platform            the shared screens (after adding a game or changing a tile, too)
//        npm run screenshots seabattle territory  just those games
//        npm run screenshots -- --jobs 1          one part at a time
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { chromium } from "playwright";
import { createServer } from "vite";
import { Camera, OUT, SIZES } from "./screenshots/camera.mjs";
import dotsclash from "./screenshots/dotsclash.mjs";
import ludo from "./screenshots/ludo.mjs";
import pool from "./screenshots/pool.mjs";
import snakesladders from "./screenshots/snakesladders.mjs";
import headcrash from "./screenshots/headcrash.mjs";
import platform from "./screenshots/platform.mjs";
import seabattle from "./screenshots/seabattle.mjs";
import territory from "./screenshots/territory.mjs";
import tictactoe from "./screenshots/tictactoe.mjs";
import ultimate from "./screenshots/ultimate.mjs";

/** The platform, then one flow per game (a new game adds its file here); the longest come first, so they start at once. */
const PARTS = { platform, seabattle, territory, ludo, pool, snakesladders, dotsclash, headcrash, ultimate, tictactoe };
/** Kept when everything is shot again: the playtests' photos of a failure. */
const KEEP = new Set(["playtest-failures"]);
const SERVER = "http://localhost:8787";
const PORT = 5199;
const DEFAULT_JOBS = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2) + 1));

const args = process.argv.slice(2);
const jobsAt = args.indexOf("--jobs");
const jobs = jobsAt === -1 ? DEFAULT_JOBS : Number(args[jobsAt + 1]);
const asked = args.filter((arg, i) => !arg.startsWith("--") && (jobsAt === -1 || i !== jobsAt + 1));
if (!Number.isInteger(jobs) || jobs < 1) {
  console.error("--jobs takes a whole number, 1 or more");
  process.exit(1);
}
const unknown = asked.filter((name) => !(name in PARTS));
if (unknown.length) {
  console.error(`Unknown part: ${unknown.join(", ")}. Parts: ${Object.keys(PARTS).join(", ")}`);
  process.exit(1);
}
try {
  await fetch(SERVER);
} catch {
  console.error(`The game server isn't running at ${SERVER}. Start it first: npm run dev:server`);
  process.exit(1);
}

// Everything shot again: clear out whatever else is there (an old layout, a part since removed).
if (!asked.length) {
  for (const entry of await readdir(OUT).catch(() => [])) if (!KEEP.has(entry)) await rm(OUT + entry, { recursive: true, force: true });
}

const vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await vite.listen();
// Make the sounds before the first page asks for them (they take longer than a page load may wait).
await vite.transformRequest("virtual:sound-files");
const browser = await chromium.launch();
const queue = asked.length ? [...asked] : Object.keys(PARTS);
const failed = [];
const runStarted = Date.now();

/** Shoots one part and prints how it went. */
async function shoot(name) {
  const started = Date.now();
  const camera = new Camera(browser, `http://localhost:${PORT}/`, name);
  await camera.clear();
  let failure = null;
  try {
    await PARTS[name](camera);
  } catch (e) {
    failure = String(e.message ?? e).split("\n")[0];
    failure += ` (photos of every phone: screenshots/${name}/failed-*.png, ${await camera.photographFailure()} of them)`;
  }
  await camera.finish(failure);
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const lines = [`${name}: ${camera.shots.length} screens in ${seconds} s`];
  if (failure) lines.push(`  ✗ stopped after "${camera.shots.at(-1)?.title ?? "the start"}": ${failure}`);
  for (const error of camera.errors) lines.push(`  page error: ${error}`);
  console.log(lines.join("\n"));
  if (failure || camera.errors.length) failed.push(name);
}

try {
  await Promise.all(
    Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      while (queue.length) await shoot(queue.shift());
    }),
  );
} finally {
  await browser.close();
  await vite.close();
}

// The index page: every part there is (shot now or before), each screen a row with every size side by side.
const parts = [];
for (const name of Object.keys(PARTS)) {
  const list = await readFile(`${OUT}${name}/shots.json`, "utf8").then(JSON.parse, () => null);
  if (list) parts.push(list);
}
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const section = ({ part, taken, failure, shots }) => `<section id="${part}">
<h2>${part} <small>${shots.length} screens, ${new Date(taken).toLocaleString()}</small></h2>
${failure ? `<p class="failed">Stopped early: ${escape(failure)}</p>` : ""}
${shots
  .map(
    ({ file, title }) => `<h3>${title}</h3><div class="row">${SIZES.map(
      ([folder, w, h]) => `<figure><img src="${part}/${folder}/${file}.png" loading="lazy"><figcaption>${folder.slice(2)} ${w}×${h}</figcaption></figure>`,
    ).join("")}</div>`,
  )
  .join("\n")}
</section>`;
await writeFile(
  OUT + "index.html",
  `<!doctype html><meta charset="utf-8"><title>Locade Games screenshots</title>
<style>body{font-family:system-ui;margin:16px;background:#eee}nav{position:sticky;top:0;background:#eee;padding:8px 0;display:flex;gap:16px;z-index:1}
h2{margin:40px 0 0;text-transform:capitalize}h2 small{font-size:13px;font-weight:normal;color:#666;text-transform:none}h3{font-size:15px;margin:20px 0 6px}
.failed{color:#b00}.row{display:flex;gap:12px;overflow-x:auto;align-items:flex-start}figure{margin:0}
img{height:420px;border:1px solid #999;background:#fff}figcaption{font-size:12px;color:#555}</style>
<nav>${parts.map(({ part }) => `<a href="#${part}">${part}</a>`).join("")}</nav>
${parts.map(section).join("\n")}`,
);

const total = ((Date.now() - runStarted) / 1000).toFixed(0);
console.log(failed.length ? `\nFAILED: ${failed.join(", ")} (${total} s)` : `\nDone in ${total} s: open screenshots/index.html`);
process.exit(failed.length ? 1 : 0);
