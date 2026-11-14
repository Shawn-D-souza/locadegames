// Ludo's own screens (loaded dice, so every look comes at once): choosing which pawn to move on the classic board, and
// someone else's turn there; the 6-arm and 8-arm boards of bigger rooms; the winner's ending; the results.
import { pick } from "../playtest/ludo.mjs";
import { seatOf, roll } from "../playtest/snakesladders.mjs";
import { sees, wait } from "../playtest/session.mjs";

/** Long enough for a move to play out on screen before a photo. */
const SETTLE_MS = 2_500;

/** Starts Ludo in a room of `count` and returns its phones in turn order. */
async function start(camera, count) {
  const players = await camera.room(count);
  await players[0].getByRole("button", { name: /^ludo/i }).click();
  for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  return order;
}

/** The first `movers` in turn order each bring their first pawn out with a 6 and move it on `step` squares. */
async function bringOut(order, movers, step) {
  for (const page of order.slice(0, movers)) {
    await roll(page, 6);
    await pick(page, 0);
    await roll(page, step);
  }
}

/** Everyone but the first in turn order quits, so the game ends with them the winner. */
async function quitAllButFirst(order) {
  for (const page of order.slice(1)) {
    await page.getByRole("button", { name: "Quit game" }).click();
    await page.getByRole("button", { name: "QUIT", exact: true }).click();
  }
}

export default async function ludo(camera) {
  // The classic board, 3 players: two pawns out, then a 6 to pick with.
  const order = await start(camera, 3);
  await bringOut(order, 3, 4);
  await roll(order[0], 6);
  await sees(order[0], /move a pawn!/i);
  await wait(SETTLE_MS);
  await camera.shoot(order[0], "pick");
  await camera.shoot(order[1], "their-turn");
  await quitAllButFirst(order);
  await sees(order[0], /you win!/i);
  await wait(1_200);
  await camera.shoot(order[0], "won");
  await sees(order[0], /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(order[0], "results");
  for (const page of order) await page.context().close();

  // Bigger rooms get bigger boards: 6 arms, then 8.
  for (const count of [6, 8]) {
    const big = await start(camera, count);
    await bringOut(big, 4, 3);
    await wait(SETTLE_MS);
    await camera.shoot(big[0], `${count}-players`);
    for (const page of big) await page.context().close();
  }
}
