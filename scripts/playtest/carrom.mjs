// Carrom: three players round one board (sides bottom, right, top), with loaded shots (the dev server lets playtests
// place the coins before a shot, so every moment comes at once): sliding the striker, a white in (+20) and shooting
// again, the queen in and covered (+50), a long press taking hold of the striker, the striker in (-10) passing the turn,
// the last coin ending the board, each phone's ending, the results with everyone's points, back to the room.
// Coins follow `createGame` (0 the queen, 1–9 white, 10–18 black); board units as in `src/shared/games/carrom/config.ts`.
import { felt, heard, sees } from "./session.mjs";
import { seatOf } from "./snakesladders.mjs";

const COINS = 19;
const QUEEN = 0;
const WHITE = 1;
const BLACK = 10;
/** The hole ahead on each side's left (side 0: the top left, side 1: the bottom left), and the striker's middle on side 0 (bottom) and side 1 (right) at `at` along its baseline. */
const HOLE = { 0: [3, 3], 1: [3, 97] };
const SPOT = { 0: (at) => [50 + at, 85], 1: (at) => [85, 50 - at] };
const AT = -20;

/** From side `side`'s striker at `AT` toward the hole ahead on its left: the direction, and a point `share` of the way along. */
function line(side, share) {
  const [sx, sy] = SPOT[side](AT);
  const [hx, hy] = HOLE[side];
  const length = Math.hypot(hx - sx, hy - sy);
  return { dx: (hx - sx) / length, dy: (hy - sy) / length, at: [sx + (hx - sx) * share, sy + (hy - sy) * share] };
}

/** A board: `spots` by coin (null: already in); every other coin parked along the bottom right, out of every shot's way. */
function table(spots) {
  return Array.from({ length: COINS }, (_, i) => {
    if (spots[i] === null) return [0, 0, false];
    const [x, y] = spots[i] ?? [60 + (i % 6) * 5, 70 + Math.floor(i / 6) * 5];
    return [x, y, true];
  });
}

/** The striker on `page`'s board: its middle on the page, the way forward and the way the baseline runs (from the canvas's data). */
async function strikerOn(page) {
  const canvas = page.locator("canvas[data-striker]");
  await canvas.waitFor({ timeout: 10_000 });
  const box = await canvas.boundingBox();
  const [x, y] = (await canvas.getAttribute("data-striker")).split(",").map(Number);
  const [ax, ay] = (await canvas.getAttribute("data-forward")).split(",").map(Number);
  const [rx, ry] = (await canvas.getAttribute("data-right")).split(",").map(Number);
  return { x: box.x + x, y: box.y + y, ax, ay, rx, ry };
}

/** Takes hold of the striker on `page` and pulls it straight back `pixels` (toward you), then lets go. */
export async function pullStriker(page, pixels) {
  const s = await strikerOn(page);
  await page.mouse.move(s.x, s.y);
  await page.mouse.down();
  await page.mouse.move(s.x - s.ax * pixels, s.y - s.ay * pixels, { steps: 5 });
  await page.mouse.up();
}

/** Holds a finger still in front of the striker until it takes hold, then pulls back `pixels` and lets go. */
async function holdAndPull(page, pixels) {
  const s = await strikerOn(page);
  const x = s.x + s.ax * 80;
  const y = s.y + s.ay * 80;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(x - s.ax * pixels, y - s.ay * pixels, { steps: 5 });
  await page.mouse.up();
}

/** Waits for `page`'s shot, loads it (the coins placed, the striker placed and aimed), takes it and lets go. */
async function shoot(page, spots, aim, power = 0.42, take = (p) => pullStriker(p, 80)) {
  await page.locator("canvas[data-striker]").waitFor({ timeout: 10_000 });
  await page.evaluate(
    ([tableSpots, shot]) => {
      window.loadedCarromShots = [{ table: tableSpots, ...shot }];
    },
    [table(spots), { at: AT, dx: aim.dx, dy: aim.dy, power }],
  );
  await take(page);
  await page.waitForFunction(() => !window.loadedCarromShots?.length, null, { timeout: 5_000 });
}

/** Whether it's `page`'s shot. */
const myShot = (page) => page.getByText(/your shot!|shoot again!|cover the queen!/i).first();
/** Waits until `page`'s board (as it tells screen readers) gives seat `seat` (in turn order) `points`. */
const hasPoints = (page, seat, points) =>
  page.getByRole("img", { name: new RegExp(`^${"[^;]*; ".repeat(seat)}[^;]*: ${points} points(;|$)`) }).waitFor({ timeout: 8_000 });

export default async function carrom(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Carrom; everyone sees the board, and only the first in turn order has the striker", async () => {
    await players[0].getByRole("button", { name: /^carrom/i }).click();
    for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    await myShot(order[0]).waitFor();
    if (await order[1].locator("canvas[data-striker]").count()) throw new Error("the second player has a striker on the first player's turn");
    for (const page of players) await page.getByRole("img", { name: /: 0 points; .*: 0 points; .*: 0 points$/ }).waitFor();
    await heard(players[0], "gameStarting");
  });
  await session.step("the corner ✕ still opens the quit question; the striker slides along the baseline", async () => {
    await order[0].getByRole("button", { name: "Quit game" }).click();
    await order[0].getByRole("button", { name: "KEEP PLAYING", exact: true }).click();
    const before = await strikerOn(order[0]);
    await order[0].mouse.move(before.x, before.y);
    await order[0].mouse.down();
    await order[0].mouse.move(before.x + before.rx * 40, before.y + before.ry * 40, { steps: 5 });
    await order[0].mouse.up();
    const after = await strikerOn(order[0]);
    if (Math.abs(after.x - before.x - before.rx * 40) > 6 || Math.abs(after.y - before.y - before.ry * 40) > 6) throw new Error(`the striker didn't slide: ${before.x},${before.y} → ${after.x},${after.y}`);
  });
  await session.step("pulling back shows the band behind the striker, growing with the pull, and only while pulling", async () => {
    const page = order[0];
    const canvas = page.locator("canvas[data-striker]");
    const band = async () => Number((await canvas.getAttribute("data-pull")) ?? 0);
    const s = await strikerOn(page);
    if ((await band()) !== 0) throw new Error("the band shows before any pull");
    await page.mouse.move(s.x, s.y);
    await page.mouse.down();
    await page.mouse.move(s.x - s.ax * 20 + 12, s.y - s.ay * 20, { steps: 4 });
    const short = await band();
    await page.mouse.move(s.x - s.ax * 50 + 30, s.y - s.ay * 50, { steps: 4 });
    const long = await band();
    // Back where it took hold: no band, and letting go there takes no shot.
    await page.mouse.move(s.x, s.y, { steps: 4 });
    const none = await band();
    await page.mouse.up();
    if (!(short > 0 && long > short && none === 0)) throw new Error(`band while pulling: ${short} then ${long}, back at the start ${none}`);
    await myShot(page).waitFor();
    if ((await band()) !== 0) throw new Error("the band stayed after letting go");
  });
  await session.step("a white in: +20 on every phone, and you shoot again", async () => {
    const aim = line(0, 0.75);
    await shoot(order[0], { [WHITE]: aim.at }, aim);
    for (const page of players) await hasPoints(page, 0, 20);
    await sees(order[0], /shoot again/i);
    await heard(order[0], "carromFlick", "carromPocket", "carromScored");
    await heard(order[1], "carromFlick", "carromPocket");
    await felt(order[0], "carromFlick", "carromScored");
  });
  await session.step("the queen in: cover her! A coin on the next shot covers her: +50", async () => {
    const aim = line(0, 0.75);
    await shoot(order[0], { [WHITE]: null, [QUEEN]: aim.at }, aim);
    await sees(order[0], /cover the queen!/i);
    await sees(order[1], /to cover the queen/i);
    await heard(order[0], "carromQueen");
    await shoot(order[0], { [WHITE]: null, [QUEEN]: null, [WHITE + 1]: aim.at }, aim);
    for (const page of players) await hasPoints(page, 0, 90);
    await sees(order[1], /covered the queen/i);
    await heard(order[1], "carromCovered");
    await felt(order[0], "carromCovered");
  });
  await session.step("a long press anywhere takes hold of the striker (felt); the striker in is -10 and the turn passes", async () => {
    const aim = line(0, 0.5);
    await shoot(order[0], { [WHITE]: null, [QUEEN]: null, [WHITE + 1]: null }, aim, 0.9, (page) => holdAndPull(page, 80));
    await felt(order[0], "carromStrikerHeld", "carromFoul");
    await sees(order[0], /striker in!/i);
    await sees(order[1], /pocketed the striker/i);
    for (const page of players) await hasPoints(page, 0, 80);
    await myShot(order[1]).waitFor();
    await heard(order[0], "carromFoul");
  });
  await session.step("the last coin in ends the board: most points wins; each phone gets its ending", async () => {
    const aim = line(1, 0.75);
    const gone = Object.fromEntries(Array.from({ length: COINS }, (_, i) => [i, i === BLACK ? aim.at : null]));
    await shoot(order[1], gone, aim);
    await sees(order[0], /you win!/i);
    await sees(order[1], /you're 2nd/i);
    await heard(order[0], "boardThump", "matchWinFanfare");
    await felt(order[0], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking with everyone's points", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await players[0].getByLabel("80 points").waitFor();
    await players[0].getByLabel("10 points").waitFor();
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /^carrom/i }).waitFor();
  });
}
