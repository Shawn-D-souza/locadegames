import type { MatchGame } from "../types";
import { applyMove, createGame } from "./rules";
import type { TicTacToeState } from "./types";

/** Tic-tac-toe plugged into the platform's match interface. A move is a cell index. */
export const ticTacToeGame: MatchGame<TicTacToeState, number> = {
  create: createGame,
  parseMove: (raw) => (Number.isInteger(raw) ? (raw as number) : null),
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) =>
    state.winner !== null ? { kind: "win", seat: state.winner } : state.isDraw ? { kind: "draw" } : { kind: "playing" },
  // First free cell: predictable, so a timeout is a penalty and never a lucky break.
  autoMove: (state) => state.board.findIndex((cell) => cell === null),
};
