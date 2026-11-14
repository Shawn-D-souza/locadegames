// Ultimate Tic-tac-toe's own screen: mid-game, a small board won by each side, on the phone that must move (sent to
// one small board). The other phone differs only in which card is lit.
import { board, playCells } from "./camera.mjs";

/** The playtest's game cut short: X takes the top-left board, O the left one; X is then sent to the bottom-right board. */
const MOVES = [3, 27, 4, 36, 5, 45, 39, 31, 40, 44, 75, 35];

export default async function ultimate(camera) {
  const players = await camera.room(2);
  await players[0].getByRole("button", { name: /ultimate/i }).click();
  for (const page of players) await board(page).waitFor();
  await playCells(players, MOVES);
  // X moves next (sent to the bottom-right board): the phone whose board has a cell to tap.
  const mover = (await board(players[0]).getByRole("button").and(players[0].locator(":enabled")).count()) ? players[0] : players[1];
  await mover.waitForTimeout(1_000);
  await camera.shoot(mover, "match");
}
