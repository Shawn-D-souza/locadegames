import type { MatchGame } from "../types";
import { applyMove, createGame, firstPlayableCell } from "./rules";
import type { UltimateState } from "./types";

/** Ultimate Tic-tac-toe plugged into the platform's match interface. A move is a cell index (0–80, board by board). */
export const ultimateGame: MatchGame<UltimateState, number> = {
  create: createGame,
  parseMove: (raw) => (Number.isInteger(raw) ? (raw as number) : null),
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) =>
    state.winner !== null ? { kind: "win", seat: state.winner } : state.isDraw ? { kind: "draw" } : { kind: "playing" },
  autoMove: firstPlayableCell,
};
