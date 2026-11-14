import type { PartyGame } from "../types";
import { chainMs } from "./config";
import { applyMove, autoMove, autoPicks, createGame, finalPlaces, hidePicks, isIn, parseMove, quitSeat } from "./rules";
import type { DotsClashState } from "./types";

/** Dots Clash plugged into the party format. A move is a cell index (a pick, then a tap). Nothing is left to chance. */
export const dotsClashGame: PartyGame<DotsClashState, number> = {
  create: createGame,
  parseMove: (raw) => parseMove(raw),
  applyMove: (state, seat, cell) => applyMove(state, seat, cell),
  turn: (state) => (state.over || state.phase === "pick" ? null : state.turn),
  allAtOnce: (state) => !state.over && state.phase === "pick",
  moves: (state) => state.moves,
  // Picking: everyone who hasn't gets a cell from the server's fresh random number; playing: the deterministic auto move.
  expire: (state, seed) => (state.phase === "pick" ? { ok: true, state: autoPicks(state, seed) } : applyMove(state, state.turn, autoMove(state))),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners: (state) => (state.winner === null ? [] : [state.winner]),
  finalPlaces,
  // The next turn's clock starts once the tap's chain (or the revealed starts landing) has played out.
  playOutMs: (state) => chainMs(state.lastMove?.waves ?? 0),
  view: hidePicks,
};
