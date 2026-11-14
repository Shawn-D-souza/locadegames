import { dieFrom } from "../dice";
import type { PartyGame } from "../types";
import { actionMs } from "./config";
import { applyMove, createGame, expire, finalPlaces, isIn, parseMove, quitSeat, type LudoMove } from "./rules";
import type { LudoState } from "./types";

/** Ludo plugged into the party format. A move is a roll (the server's random number is the die) or a pawn picked for it. */
export const ludoGame: PartyGame<LudoState, LudoMove> = {
  create: createGame,
  parseMove,
  applyMove: (state, seat, move, seed) => applyMove(state, seat, move, dieFrom(seed)),
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  // Time ran out: the server rolls for you and moves by a fixed rule (or moves the die you rolled by it).
  expire: (state, seed) => expire(state, dieFrom(seed)),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners: (state) => finalPlaces(state).filter((p) => p.place === 1 && !p.quit).map((p) => p.seat),
  finalPlaces,
  playOutMs: (state) => (state.last ? actionMs(state.last) : 0),
  view: (state) => state,
};
