import type { PartyGame } from "../types";
import { shotMs } from "./config";
import { applyMove, createGame, expire, finalPlaces, isIn, parseMove, quitSeat, type PoolMove } from "./rules";
import type { PoolState } from "./types";

/** Pool plugged into the party format. A move is a shot; the server plays it out and keeps where the balls stopped. */
export const poolGame: PartyGame<PoolState, PoolMove> = {
  create: createGame,
  parseMove,
  applyMove: (state, seat, move) => applyMove(state, seat, move),
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  expire: (state) => expire(state),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners: (state) => (state.winner === null ? [] : [state.winner]),
  finalPlaces,
  playOutMs: (state) => (state.last?.kind === "shot" ? shotMs(state.last.steps) : 0),
  view: (state) => state,
};
