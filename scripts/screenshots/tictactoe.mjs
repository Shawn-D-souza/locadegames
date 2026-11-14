// Tic-tac-toe's own screens: a match being played, and the three endings (held still on the dev preview page).
// The tournament around it (points, round intro, results) is the platform's.
import { board, playCells } from "./camera.mjs";

export default async function tictactoe(camera) {
  const players = await camera.room(2);
  await players[0].getByRole("button", { name: /^tic/i }).click();
  for (const page of players) await board(page).waitFor();
  await playCells(players, [4, 0, 2]);
  await camera.shoot(players[0], "match");

  for (const outcome of ["WIN", "LOSE", "DRAW"]) {
    const page = await camera.player();
    await page.goto(camera.base + "?preview=celebrations");
    await page.getByRole("button", { name: outcome, exact: true }).click();
    await page.waitForTimeout(2_500);
    await camera.shoot(page, `ending-${outcome.toLowerCase()}`);
  }
}
