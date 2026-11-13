import type { MatchGame } from "../types";
import { applyMove, autoShot, createGame, expire, keepsClock, parseMove, turnTimeMs, viewFor } from "./rules";
import type { SeaBattleMove, SeaBattleState } from "./types";

/** Sea Battle plugged into the platform's match interface. A move places your fleet (`{ place }`) or fires at a cell (`{ fire }`). */
export const seaBattleGame: MatchGame<SeaBattleState, SeaBattleMove> = {
  create: createGame,
  parseMove,
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) => (state.winner !== null ? { kind: "win", seat: state.winner } : { kind: "playing" }),
  autoMove: (state) => ({ fire: autoShot(state) }),
  turnTimeMs,
  keepsClock,
  expire,
  viewFor,
};
