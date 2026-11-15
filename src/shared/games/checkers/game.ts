import type { MatchGame } from "../types";
import { applyMove, createGame, firstLegalMove, parseMove } from "./rules";
import type { CheckersMove, CheckersState } from "./types";

/** Checkers plugged into the platform's match interface. A move is a piece's whole move, a chain of jumps played to its end. */
export const checkersGame: MatchGame<CheckersState, CheckersMove> = {
  create: createGame,
  parseMove,
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) =>
    state.winner !== null ? { kind: "win", seat: state.winner } : state.isDraw ? { kind: "draw" } : { kind: "playing" },
  autoMove: firstLegalMove,
};
