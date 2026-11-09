import type { Seat } from "../types";

export type { Seat } from "../types";

export type Cell = Seat | null;

/** A small board: still open, won by a seat, or full with no line ("draw"). Won and full boards take no more moves. */
export type SmallBoard = Seat | "draw" | null;

export interface UltimateState {
  /** All 81 cells, board by board (`board * 9 + cell`). */
  cells: Cell[];
  /** The 9 small boards, left to right, top to bottom. */
  boards: SmallBoard[];
  turn: Seat;
  /** The small board the player to move must play in; null = any open board. */
  next: number | null;
  winner: Seat | null;
  /** The three small boards in a row that won, or null. */
  winningLine: number[] | null;
  isDraw: boolean;
  /** The last cell played (0–80), or null before the first move. */
  lastMove: number | null;
}
