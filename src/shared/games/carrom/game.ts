import type { PartyGame } from "../types";
import { shotMs } from "./config";
import { applyMove, createGame, expire, finalPlaces, isIn, parseMove, quitSeat, winners, type CarromMove } from "./rules";
import type { CarromState } from "./types";

/** Carrom plugged into the party format. A move is a shot; the server plays it out and keeps where the coins stopped. */
export const carromGame: PartyGame<CarromState, CarromMove> = {
  create: (players) => createGame(players),
  parseMove,
  applyMove: (state, seat, move) => applyMove(state, seat, move),
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  expire: (state) => expire(state),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners: (state) => (state.over ? winners(state) : []),
  finalPlaces,
  playOutMs: (state) => (state.last?.kind === "shot" ? shotMs(state.last.steps) : 0),
  view: (state) => state,
};
