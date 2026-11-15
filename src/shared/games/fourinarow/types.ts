import type { Seat } from "../types";

export type { Seat } from "../types";

/** A hole on the board: empty, or a seat's disc. */
export type Cell = Seat | null;

/** A move is the column a disc is dropped in, 0 (left) … 6. */
export type Column = number;

export interface FourInARowState {
  /** Row by row from the top: cell `row × columns + column`. Discs fall to the lowest empty one. */
  cells: Cell[];
  turn: Seat;
  winner: Seat | null;
  /** The winning run of discs, end to end (four, or more when one disc joins two runs), or null. */
  winningLine: number[] | null;
  isDraw: boolean;
  /** The cell the last disc landed in. */
  lastMove: number | null;
}
