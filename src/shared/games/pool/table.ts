import { POOL_CONFIG } from "./config";

/**
 * The table's shape for the physics and the drawing alike: the cushions' straight lines, broken by the six pockets'
 * mouths, and the round jaws where each cushion ends. Lines run along the rails at the cushions' noses: the playing
 * surface is `0 … length` by `0 … width`; a ball's middle over a hole, or crossing a line through a mouth, means it
 * dropped.
 */

const { length: L, width: W } = POOL_CONFIG.table;
const { cornerMouth: CM, sideMouth: SM, corner: CORNER, side: SIDE } = POOL_CONFIG.pockets;

export interface Point {
  x: number;
  y: number;
}

/** A cushion: a straight stretch of one rail, from `from` to `to` along it (x on the long rails, y on the short ones). */
export interface Cushion {
  /** Which rail: the line it lies on. */
  side: "top" | "bottom" | "head" | "foot";
  from: number;
  to: number;
}

/** The six cushions: two on each long rail (split by the middle pocket), one on each short rail. */
export const CUSHIONS: readonly Cushion[] = [
  { side: "bottom", from: CM, to: L / 2 - SM },
  { side: "bottom", from: L / 2 + SM, to: L - CM },
  { side: "top", from: CM, to: L / 2 - SM },
  { side: "top", from: L / 2 + SM, to: L - CM },
  { side: "head", from: CM, to: W - CM },
  { side: "foot", from: CM, to: W - CM },
];

/** Every cushion's two ends: the round jaws either side of a pocket's mouth. */
export const JAWS: readonly Point[] = CUSHIONS.flatMap((c) => {
  if (c.side === "bottom" || c.side === "top") {
    const y = c.side === "bottom" ? 0 : W;
    return [
      { x: c.from, y },
      { x: c.to, y },
    ];
  }
  const x = c.side === "head" ? 0 : L;
  return [
    { x, y: c.from },
    { x, y: c.to },
  ];
});

/** A pocket's hole: its middle (where a potted ball drops to) and its radius. */
export interface Hole extends Point {
  r: number;
}

/** The six holes, just outside the cloth: the four corners, then the two middles. */
export const POCKETS: readonly Hole[] = [
  { x: -CORNER.out, y: -CORNER.out, r: CORNER.radius },
  { x: L + CORNER.out, y: -CORNER.out, r: CORNER.radius },
  { x: -CORNER.out, y: W + CORNER.out, r: CORNER.radius },
  { x: L + CORNER.out, y: W + CORNER.out, r: CORNER.radius },
  { x: L / 2, y: -SIDE.out, r: SIDE.radius },
  { x: L / 2, y: W + SIDE.out, r: SIDE.radius },
];

/** The hole a ball's middle at `x, y` is over, or -1. */
export function holeAt(x: number, y: number): number {
  return POCKETS.findIndex((p) => (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < p.r * p.r);
}

/** The pocket a ball leaving the table at `x, y` dropped into: the nearest. */
export function pocketAt(x: number, y: number): number {
  let best = 0;
  let bestDistance = Infinity;
  POCKETS.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** Whether `x` (along a long rail) is in front of a pocket's mouth: no cushion there. */
export const inLongMouth = (x: number) => x < CM || x > L - CM || (x > L / 2 - SM && x < L / 2 + SM);
/** Whether `y` (along a short rail) is in front of a corner pocket's mouth. */
export const inShortMouth = (y: number) => y < CM || y > W - CM;
