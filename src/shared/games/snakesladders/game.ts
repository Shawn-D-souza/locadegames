import type { PartyGame } from "../types";
import { rollMs } from "./config";
import { applyMove, createGame, dieFrom, finalPlaces, isIn, parseMove, quitSeat, type RollMove } from "./rules";
import type { SnakesLaddersState } from "./types";

/** Snakes & Ladders plugged into the party format. A move is a roll; the server's random number is the die. */
export const snakesLaddersGame: PartyGame<SnakesLaddersState, RollMove> = {
  create: createGame,
  parseMove,
  applyMove: (state, seat, move, seed) => applyMove(state, seat, move.die ?? dieFrom(seed)),
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  // Time ran out: the server rolls for you (owner decision), as you would have.
  expire: (state, seed) => applyMove(state, state.turn, dieFrom(seed)),
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners: (state) => finalPlaces(state).filter((p) => p.place === 1 && !p.quit).map((p) => p.seat),
  finalPlaces,
  playOutMs: (state) => (state.lastRoll ? rollMs(state.lastRoll) : 0),
  view: (state) => state,
};
