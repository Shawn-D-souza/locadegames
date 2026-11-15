import type { MatchGame } from "../types";
import { applyMove, createGame, expire, firstLegalMove, parseMove, turnTimeMs } from "./rules";
import type { ChessMove, ChessState } from "./types";

/**
 * Chess plugged into the platform's match interface. Each player has a clock (`clocks`) and each move a limit: the turn
 * lasts whichever is shorter (`turnTimeMs`), and running out loses (`expire`; owner decision: never a move played for you).
 */
export const chessGame: MatchGame<ChessState, ChessMove> = {
  create: createGame,
  parseMove,
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) =>
    state.winner !== null ? { kind: "win", seat: state.winner } : state.isDraw ? { kind: "draw" } : { kind: "playing" },
  autoMove: firstLegalMove,
  turnTimeMs,
  expire,
};
