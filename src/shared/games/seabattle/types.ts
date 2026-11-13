import type { Seat } from "../types";

/** A ship where it lies: its first cell (top or left end) and which way it runs. Its length comes from its place in the fleet. */
export interface Ship {
  cell: number;
  vertical: boolean;
}

/** A player's ships, in fleet order (`SEABATTLE_CONFIG.fleet`). */
export type Fleet = Ship[];

/** A ship that went down: everyone sees it. */
export interface Wreck extends Ship {
  /** Its place in the fleet (so its length). */
  index: number;
}

/** What a cell of someone's waters shows: untouched, a miss or a hit. */
export const MARK = { none: 0, miss: 1, hit: 2 } as const;
export type CellMark = (typeof MARK)[keyof typeof MARK];

/** place: both players set their fleets at the same time · fire: turns, a hit shoots again. */
export type SeaBattlePhase = "place" | "fire";

export interface SeaBattleState {
  phase: SeaBattlePhase;
  /** Who fires first. */
  starter: Seat;
  /** Whose shot it is (while placing: the starter, nothing waits on it). */
  turn: Seat;
  /** Each seat's fleet once placed. A phone only gets its own until the match is over (see `viewFor`). */
  fleets: [Fleet | null, Fleet | null];
  ready: [boolean, boolean];
  /** Each seat's own waters as the other has shot at them, `CELL_COUNT` each. */
  marks: [CellMark[], CellMark[]];
  /** Each seat's ships sunk so far, in the order they went down. */
  wrecks: [Wreck[], Wreck[]];
  /** Shots fired in the match. */
  shots: number;
  lastShot: { seat: Seat; cell: number } | null;
  /** Whoever sank the whole fleet first (there are no draws). */
  winner: Seat | null;
}

export type SeaBattleMove = { place: Fleet } | { fire: number };
