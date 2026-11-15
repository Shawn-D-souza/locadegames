// Checkers' own screens: a game under way on the phone whose turn it is (kings on the board, the last move's trail),
// a piece picked up (dots where it can go), a capture that must be taken (its piece's ring blinking), and the winner's
// ending on its board. Played with the playtest's short game; the tournament around it is the platform's.
import { GAME } from "../playtest/checkers.mjs";
import { board, whoever } from "./camera.mjs";

const where = (square) => `row ${Math.floor(square / 8) + 1}, column ${(square % 8) + 1}`;
const pickUp = (page, square) => page.getByRole("button", { name: new RegExp(`^Pick up .+ on ${where(square)}$`) });
const moveTo = (page, square) => page.getByRole("button", { name: `Move to ${where(square)}`, exact: true });
const label = (square) => `Row ${Math.floor(square / 8) + 1}, column ${(square % 8) + 1}`;
const pieceOn = (page, square) => board(page).getByRole("img", { name: new RegExp(`^${label(square)}: .+'s (piece|king)$`) });

/** Plays the game's moves `from` up to (not including) `to`, each on its mover's phone, waiting until every phone shows it. */
async function playMoves(first, second, from, to) {
  for (let n = from; n < to; n++) {
    const [start, ...path] = GAME[n];
    const page = n % 2 === 0 ? first : second;
    await pickUp(page, start).click();
    for (const square of path) await moveTo(page, square).click();
    for (const p of [first, second]) await pieceOn(p, path.at(-1)).waitFor({ timeout: 5_000 });
  }
}

export default async function checkers(camera) {
  const players = await camera.room(2);
  await players[0].getByRole("button", { name: /^checkers/i }).click();
  for (const page of players) await board(page).waitFor();
  const first = await whoever(players, (page) => page.getByRole("button", { name: /^Pick up / }).first());
  const second = players.find((page) => page !== first);

  // The second player's first move leaves a capture the first must take: its piece's ring blinks.
  await playMoves(first, second, 0, 2);
  await first.mouse.move(0, 0);
  await first.waitForTimeout(400);
  await camera.shoot(first, "capture-forced");

  // Further on: both have a king, and it's the first player's turn again.
  await playMoves(first, second, 2, 14);
  await first.waitForTimeout(400);
  await camera.shoot(first, "match");
  // Picked up: dots on the squares it can go to.
  await pickUp(first, GAME[14][0]).click();
  await camera.shoot(first, "picked");

  // Played to the end: the win, shot once its board has filled (before it moves on by itself).
  await moveTo(first, GAME[14][1]).click();
  for (const p of players) await pieceOn(p, GAME[14][1]).waitFor({ timeout: 5_000 });
  await playMoves(first, second, 15, GAME.length);
  await first.getByText(/you win!/i).waitFor({ timeout: 5_000 });
  await first.waitForTimeout(1_200);
  await camera.shoot(first, "ending-win");
}
