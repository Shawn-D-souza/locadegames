import { CHECKERS_CONFIG } from "../../../shared/games/checkers/config";
import { columnOf, rowOf, squareAt } from "../../../shared/games/checkers/rules";
import type { Seat } from "../../../shared/games/types";

const { size } = CHECKERS_CONFIG;

/** A place on the board as drawn: columns across and rows down from the top-left, in squares (between squares too). */
export interface Point {
  x: number;
  y: number;
}

/** The board is turned round on the second seat's phone, so your own pieces are always at the bottom (my call; watchers see the first seat's side). */
export const isFlipped = (viewer: Seat | null) => viewer === 1;

/** Where a square of the board is drawn. */
export function pointOf(square: number, flipped: boolean): Point {
  const x = columnOf(square);
  const y = rowOf(square);
  return flipped ? { x: size - 1 - x, y: size - 1 - y } : { x, y };
}

/** The square drawn under a point, or null off the board. */
export function squareUnder(point: Point, flipped: boolean): number | null {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return flipped ? squareAt(size - 1 - y, size - 1 - x) : squareAt(y, x);
}

/** The square drawn `index`-th, in reading order on screen. */
export const squareDrawnAt = (index: number, flipped: boolean) => (flipped ? size * size - 1 - index : index);
