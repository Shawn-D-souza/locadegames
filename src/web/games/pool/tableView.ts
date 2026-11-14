import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { POOL_LOOK } from "./look";

const { length: L, width: W } = POOL_CONFIG.table;
const RAIL = POOL_LOOK.rail;

/** The whole table with its rail, in table units: long side and short side. */
export const TABLE_LONG = L + 2 * RAIL;
export const TABLE_SHORT = W + 2 * RAIL;

/**
 * How the table sits on screen: lying along the screen's long side, so in portrait it stands up with the head rail
 * (where the break comes from) at the bottom, and in landscape it lies with the head rail on the left. `scale`: pixels
 * per table unit.
 */
export interface TableView {
  portrait: boolean;
  scale: number;
}

/** The table's size on screen (pixels) for a view. */
export function viewSize(view: TableView): { width: number; height: number } {
  const long = TABLE_LONG * view.scale;
  const short = TABLE_SHORT * view.scale;
  return view.portrait ? { width: short, height: long } : { width: long, height: short };
}

/** The biggest view that fits in `width` by `height` (pixels). */
export function fitView(width: number, height: number, portrait: boolean): TableView {
  const scale = portrait ? Math.min(width / TABLE_SHORT, height / TABLE_LONG) : Math.min(width / TABLE_LONG, height / TABLE_SHORT);
  return { portrait, scale: Math.max(scale, 0) };
}

/** The canvas transform taking table units to the screen's pixels (times `dpr`): for `ctx.setTransform`. */
export function tableTransform(view: TableView, dpr: number): [number, number, number, number, number, number] {
  const s = view.scale * dpr;
  // Portrait turns the table a quarter turn: its length runs up the screen, its width left to right.
  return view.portrait ? [0, -s, s, 0, RAIL * s, (L + RAIL) * s] : [s, 0, 0, s, RAIL * s, RAIL * s];
}

/** A point on screen (pixels from the table's top left corner) in table units. */
export function toTable(view: TableView, px: number, py: number): { x: number; y: number } {
  const u = px / view.scale - RAIL;
  const v = py / view.scale - RAIL;
  return view.portrait ? { x: L - v, y: u } : { x: u, y: v };
}

/** A point in table units on screen (pixels from the table's top left corner); `toTable` backwards. */
export function toScreen(view: TableView, x: number, y: number): { x: number; y: number } {
  const [u, v] = view.portrait ? [y, L - x] : [x, y];
  return { x: (u + RAIL) * view.scale, y: (v + RAIL) * view.scale };
}

/** A direction on the table as a direction on screen (the table turns a quarter in portrait). */
export function screenDirection(view: TableView, dx: number, dy: number): { x: number; y: number } {
  return view.portrait ? { x: dy, y: -dx } : { x: dx, y: dy };
}
