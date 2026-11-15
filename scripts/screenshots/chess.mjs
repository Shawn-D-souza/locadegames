// Chess' own screens: a game under way on the phone whose turn it is (both clocks, the castled king), a piece picked up (dots where it can go, a ring round a piece it can take), the promotion picker, and the
// winner's ending (checkmate: the mated king's square coral). Played with the playtest's short game; the tournament
// around it is the platform's.
import { CASTLING, GAME, PROMOTION, moveTo, pickUp, playMove } from "../playtest/chess.mjs";
import { board, whoever } from "./camera.mjs";

export default async function chess(camera) {
  const players = await camera.room(2);
  await players[0].getByRole("button", { name: /^chess/i }).click();
  for (const page of players) await board(page).waitFor();
  const first = await whoever(players, (page) => page.getByRole("button", { name: /^Pick up / }).first());
  const second = players.find((page) => page !== first);
  const playMoves = async (from, to) => {
    for (let n = from; n < to; n++) await playMove(first, second, n);
  };

  // A pawn on the far row: the picker asks what it becomes.
  await playMoves(0, PROMOTION);
  const [from, to] = GAME[PROMOTION];
  await pickUp(first, from).click();
  await moveTo(first, to).click();
  await first.getByRole("group", { name: "Promote your pawn to" }).waitFor();
  await camera.shoot(first, "promotion");
  // A tap beside the choices puts the pawn back.
  await first.getByRole("button", { name: "Keep the pawn" }).click({ position: { x: 8, y: 8 } });
  await playMoves(PROMOTION, CASTLING + 2);

  // Further on: castled, a queen made, and the first player to move again.
  await first.mouse.move(0, 0);
  await first.waitForTimeout(400);
  await camera.shoot(first, "match");
  // Picked up: dots where the queen can go, a ring round the rook it can take.
  await pickUp(first, GAME[CASTLING + 2][0]).click();
  await camera.shoot(first, "picked");

  // Played to the end: checkmate, shot once its board has filled (before it moves on by itself).
  await pickUp(first, GAME[CASTLING + 2][0]).click();
  await playMoves(CASTLING + 2, GAME.length);
  await first.getByText(/you win!/i).waitFor({ timeout: 5_000 });
  await first.waitForTimeout(1_200);
  await camera.shoot(first, "ending-win");
}
