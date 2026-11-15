import type { ChessState, DrawReason, WinReason } from "../../../shared/games/chess/types";

const WIN_DETAILS: Record<WinReason, string> = {
  checkmate: "Checkmate",
  clock: "Out of time",
  moveLimit: "Over 2 min on a move",
};

const DRAW_DETAILS: Record<DrawReason, string> = {
  stalemate: "Stalemate",
  material: "Nobody can checkmate",
  repetition: "Same position 3 times",
  quiet: "50 moves, no capture",
};

/** Why a game ended, under the result on the board ("Checkmate", "Stalemate"…); none while it's played. */
export function endDetail(game: ChessState): string | null {
  if (game.winReason) return WIN_DETAILS[game.winReason];
  if (game.drawReason) return DRAW_DETAILS[game.drawReason];
  return null;
}
