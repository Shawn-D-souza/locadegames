import type { TicTacToeState } from "../../../shared/games/tictactoe/types";
import { defineSounds } from "../../sound/definition";
import { pop } from "../../sound/kit";
import type { ScaleNote } from "../../sound/pitch";

/** A small climb as the board fills, by move number, staying low: the board is the instrument, not a melody. */
const X_STEPS: readonly ScaleNote[] = ["A4", "A4", "A4", "B4", "B4", "B4", "D5", "D5", "D5"];
const O_STEPS: readonly ScaleNote[] = ["F#4", "F#4", "F#4", "A4", "A4", "A4", "B4", "B4", "B4"];

/** One round bop per mark, on the same pop as the rest of the app. */
export const TICTACTOE_SOUNDS = defineSounds({
  ticTacToeMarkX: {
    about: "An X lands: one round bop, the same as O but a little higher and shorter, so you can tell who moved. Take = move number; a small climb as the board fills.",
    level: "event",
    room: 0.1,
    variants: X_STEPS.length,
    render(mix, move) {
      mix.add(pop(mix, { note: X_STEPS[move]!, from: 0.72, glide: 0.01, decay: 0.07 }));
    },
  },
  ticTacToeMarkO: {
    about: "An O lands: one round bop, a little lower and longer than X, so you can tell who moved. Take = move number; a small climb as the board fills.",
    level: "event",
    room: 0.1,
    variants: O_STEPS.length,
    render(mix, move) {
      mix.add(pop(mix, { note: O_STEPS[move]!, from: 0.72, glide: 0.012, decay: 0.085 }));
    },
  },
});

export type TicTacToeMarkSound = "ticTacToeMarkX" | "ticTacToeMarkO";

/** The sound of the mark just placed, and its take (how many moves came before it). */
export function lastMarkSound(game: TicTacToeState): { sound: TicTacToeMarkSound; variant: number } | null {
  if (game.lastMove === null) return null;
  const seat = game.board[game.lastMove];
  if (seat === null || seat === undefined) return null;
  return { sound: seat === 0 ? "ticTacToeMarkX" : "ticTacToeMarkO", variant: game.board.filter((cell) => cell !== null).length - 1 };
}
