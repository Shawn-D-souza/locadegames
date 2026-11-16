import type { PartyGame } from "../types";
import { flipPlayOutMs, MEMORY_CONFIG } from "./config";
import { applyMove, createGame, expire, finalPlaces, isIn, parseMove, quitSeat, view, winners, type MemoryFlip } from "./rules";
import type { MemoryState } from "./types";

/**
 * Memory plugged into the party format. A move is a card number; a turn that runs out turns no card (`expire`). What a
 * card turns out to be is drawn the first time it's turned, from the server's fresh random number, and phones only ever
 * see cards face up.
 */
export const memoryGame: PartyGame<MemoryState, MemoryFlip> = {
  create: (players, seed) => createGame(players, seed),
  parseMove,
  applyMove,
  turn: (state) => (state.over ? null : state.turn),
  allAtOnce: () => false,
  moves: (state) => state.moves,
  expire,
  isIn,
  quitSeat,
  over: (state) => state.over,
  winners,
  finalPlaces,
  // The next card's clock starts once this one has turned on every phone (and a pair has popped, or a miss has shown
  // and turned back); after a turn ran out, once a card they had face up has turned back.
  playOutMs: (state) =>
    state.timeout !== null
      ? state.timeout.card === null
        ? 0
        : MEMORY_CONFIG.flipMs
      : state.lastMove === null
        ? 0
        : flipPlayOutMs(state.lastMove.cards.length, state.lastMove.matched),
  view,
};
