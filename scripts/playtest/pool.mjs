// Pool: three players round one table, with loaded shots (the dev server lets playtests place the balls before a
// shot, so every moment comes at once): one of yours in and shooting again, a long press taking hold of the cue, a foul passing the turn, the black in too
// early putting a player out, the black after all of yours winning, each phone's ending, the results, back to the room.
// Balls follow `createGame` (0 the cue ball, 1 the black, then 4 each for 3 players: seat 0's 2–5, seat 1's 6–9, seat
// 2's 10–13); table units as in `src/shared/games/pool/config.ts`.
import { felt, heard, sees } from "./session.mjs";
import { seatOf } from "./snakesladders.mjs";

const BALLS = 14;
const RADIUS = 1.7;
const WIDTH = 50;
/** A line from the cue ball at (70, 15) through (90, 5) runs into the bottom right corner pocket. */
const CUE = [70, 15];
const ON_THE_LINE = [90, 5];
const INTO_THE_CORNER = { dx: 30 / Math.hypot(30, 15), dy: -15 / Math.hypot(30, 15) };

/** A table: `spots` by ball (null: off the table); every other ball in a row along the top rail, out of the way. */
function table(spots) {
  return Array.from({ length: BALLS }, (_, i) => {
    if (spots[i] === null) return [0, 0, false];
    const [x, y] = spots[i] ?? [8 + i * 5, WIDTH - RADIUS - 0.5];
    return [x, y, true];
  });
}

/** The cue on `page`'s table: its ball's middle on the page and the way back along the stick (from the canvas's data). */
async function cueOn(page) {
  const canvas = page.locator("canvas[data-cue]");
  await canvas.waitFor({ timeout: 10_000 });
  const box = await canvas.boundingBox();
  const [x, y] = (await canvas.getAttribute("data-cue")).split(",").map(Number);
  const [bx, by] = (await canvas.getAttribute("data-back")).split(",").map(Number);
  return { x: box.x + x, y: box.y + y, bx, by };
}

/** Takes hold of the cue ball on `page`'s table and pulls the cue back `pixels`, then lets go. */
export async function pullCue(page, pixels) {
  const cue = await cueOn(page);
  await page.mouse.move(cue.x, cue.y);
  await page.mouse.down();
  await page.mouse.move(cue.x + cue.bx * pixels, cue.y + cue.by * pixels, { steps: 5 });
  await page.mouse.up();
}

/** Holds a finger still in front of the cue ball (away from the stick) until it takes hold of the cue, then pulls back `pixels` and lets go. */
async function holdAndPull(page, pixels) {
  const cue = await cueOn(page);
  const x = cue.x - cue.bx * 60;
  const y = cue.y - cue.by * 60;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(x + cue.bx * pixels, y + cue.by * pixels, { steps: 5 });
  await page.mouse.up();
}

/** Waits for `page`'s shot, loads it (the balls placed and the cue aimed), takes it (pulling the cue back, by default from the cue ball) and lets go. */
async function shoot(page, spots, aim = INTO_THE_CORNER, take = (p) => pullCue(p, 80)) {
  await page.locator("canvas[data-cue]").waitFor({ timeout: 10_000 });
  await page.evaluate(
    ([tableSpots, shot]) => {
      window.loadedShots = [{ table: tableSpots, ...shot, power: 0.6 }];
    },
    [table(spots), aim],
  );
  await take(page);
  await page.waitForFunction(() => !window.loadedShots?.length, null, { timeout: 5_000 });
}

/** Whether it's `page`'s shot: the cue waits on its table, and the banner says so. */
const myShot = (page) => page.getByText(/your shot!|shoot again!|sink the black!/i).first();

export default async function pool(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Pool; everyone sees the table, and only the first in turn order may shoot", async () => {
    await players[0].getByRole("button", { name: /^pool/i }).click();
    for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    await myShot(order[0]).waitFor();
    if (await order[1].locator("canvas[data-cue]").count()) throw new Error("the second player has a cue on the first player's turn");
    for (const page of players) await page.getByRole("img", { name: /: 4 left; .*: 4 left; .*: 4 left$/ }).waitFor();
    await heard(players[0], "gameStarting");
  });
  await session.step("on your shot the whole screen works the cue, but the corner ✕ still opens the quit question", async () => {
    await order[0].getByRole("button", { name: "Quit game" }).click();
    await order[0].getByRole("button", { name: "KEEP PLAYING", exact: true }).click();
    await myShot(order[0]).waitFor();
  });
  await session.step("one of yours in: it drops on every phone and you shoot again", async () => {
    await shoot(order[0], { 0: CUE, 2: ON_THE_LINE });
    for (const page of players) await page.getByRole("img", { name: /^[^;]*: 3 left;/ }).waitFor({ timeout: 8_000 });
    await sees(order[0], /shoot again/i);
    await heard(order[0], "poolStrike", "poolPocket", "poolPotted");
    await heard(order[1], "poolStrike", "poolPocket");
    await felt(order[0], "poolStrike", "poolPotted");
  });
  await session.step("a long press anywhere takes hold of the cue (felt) to pull back from there; someone else's ball first is a foul", async () => {
    await shoot(order[0], { 0: CUE, 2: null, 6: ON_THE_LINE }, INTO_THE_CORNER, (page) => holdAndPull(page, 80));
    await felt(order[0], "poolCueHeld");
    await sees(order[0], /wrong ball first/i);
    await sees(order[1], /hit the wrong ball first/i);
    await myShot(order[1]).waitFor();
    await heard(order[0], "poolFoul");
    await felt(order[0], "poolFoul");
  });
  await session.step("the black in before your balls: you're out, your balls leave, the black goes back", async () => {
    await shoot(order[1], { 0: CUE, 2: null, 6: null, 1: ON_THE_LINE });
    await sees(order[1], /you're out/i);
    await sees(order[0], /sank the black/i);
    await order[1].getByRole("button", { name: "Leave room" }).waitFor();
    await myShot(order[2]).waitFor();
    await heard(order[1], "poolOut");
    await felt(order[1], "poolOut");
  });
  await session.step("the black after all of yours wins; each phone gets its ending", async () => {
    const out = Object.fromEntries([2, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => [i, null]));
    await shoot(order[2], { ...out, 0: CUE, 1: ON_THE_LINE });
    await sees(order[2], /you win!/i);
    await sees(order[0], /you're 2nd/i);
    await heard(order[2], "boardThump", "matchWinFanfare");
    await felt(order[2], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /^pool/i }).waitFor();
  });
}
