import type { PartyGame } from "../types";
import { lineMs } from "./config";
import { applyMove, autoMove, createGame, finalPlaces, isIn, parseMove, quitSeat, winners } from "./rules";
import type { DotsBoxesState } from "./types";

/** Dots & Boxes plugged into the party format. A move is a line number. Nothing is left to chance, and nothing is secret. */
export const dotsBoxesGame: PartyGame<DotsBoxesState, number> = {
  create: (players) => createGame(players),
  parseMove: (raw) => parseMove(raw),
  applyMove: (state, seat, line) => applyMove(state, seat, line),
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  expire: (state) => applyMove(state, state.turn, autoMove(state)),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners,
  finalPlaces,
  // The next line's clock starts once this one (and any box it won) has drawn in on every phone.
  playOutMs: (state) => (state.lastMove === null ? 0 : lineMs(state.lastMove.boxes.length)),
  view: (state) => state,
};
