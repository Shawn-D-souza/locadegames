import type { MatchGame } from "../types";
import { applyMove, createGame, leftmostOpenColumn } from "./rules";
import type { Column, FourInARowState } from "./types";

/** 4 in a Row plugged into the platform's match interface. A move is a column. */
export const fourInARowGame: MatchGame<FourInARowState, Column> = {
  create: createGame,
  parseMove: (raw) => (Number.isInteger(raw) ? (raw as number) : null),
  applyMove,
  turn: (state) => state.turn,
  outcome: (state) =>
    state.winner !== null ? { kind: "win", seat: state.winner } : state.isDraw ? { kind: "draw" } : { kind: "playing" },
  autoMove: leftmostOpenColumn,
};
