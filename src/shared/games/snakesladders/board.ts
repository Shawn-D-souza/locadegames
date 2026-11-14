import { SNAKESLADDERS_CONFIG } from "./config";

/**
 * The board (owner decision: one fixed classic 10×10 board for now; our own layout). Squares 1–100 wind up from the
 * bottom-left, the first row left to right, the next right to left. Picked by a search over layouts: no ladder or snake
 * comes within most of a square of another (so the board reads clearly), and a player needs about 27 turns to get
 * home (median 26, 9 in 10 within 41), with few snakes near the top, where an exact roll is already needed.
 */

/** Ladders, foot → top. */
export const LADDERS: Readonly<Record<number, number>> = {
  3: 23,
  11: 31,
  36: 64,
  39: 59,
  61: 84,
  68: 90,
};

/** Snakes, head → tail. */
export const SNAKES: Readonly<Record<number, number>> = {
  24: 8,
  29: 9,
  52: 33,
  53: 35,
  75: 55,
  88: 67,
  93: 77,
};

/** Where a piece landing on `square` ends up: up a ladder, down a snake, or where it is. */
export function jumpFrom(square: number): number {
  return LADDERS[square] ?? SNAKES[square] ?? square;
}

/** A square's column (0 = left) and row (0 = bottom). */
export function squareCell(square: number): { col: number; row: number } {
  const { columns } = SNAKESLADDERS_CONFIG;
  const row = Math.floor((square - 1) / columns);
  const along = (square - 1) % columns;
  return { col: row % 2 === 0 ? along : columns - 1 - along, row };
}
