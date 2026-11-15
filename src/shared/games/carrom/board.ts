import { CARROM_CONFIG } from "./config";
import type { CarromCoin, CarromSide, CoinKind } from "./types";

/**
 * The board's shape for the physics, the rules and the drawing alike: a square surface `0 … size` inside the frame, a
 * round hole in each corner, and a baseline along each side where that side's player places the striker. Only adding,
 * multiplying, dividing and square roots, so every phone gets the same numbers as the server.
 */

const { size: S } = CARROM_CONFIG.board;
const { coinRadius: RC, strikerRadius: RS, coinGap, pocket, baseline } = CARROM_CONFIG;
const MID = S / 2;

export interface Point {
  x: number;
  y: number;
}

/** A pocket's hole: its middle (where a pocketed disc drops to) and its radius. */
export interface Hole extends Point {
  r: number;
}

/** The four holes, one in each corner, touching both walls. */
export const POCKETS: readonly Hole[] = [
  { x: pocket.inset, y: pocket.inset, r: pocket.radius },
  { x: S - pocket.inset, y: pocket.inset, r: pocket.radius },
  { x: pocket.inset, y: S - pocket.inset, r: pocket.radius },
  { x: S - pocket.inset, y: S - pocket.inset, r: pocket.radius },
];

/** The hole a disc's middle at `x, y` is over, or -1. */
export function holeAt(x: number, y: number): number {
  return POCKETS.findIndex((p) => (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < p.r * p.r);
}

/**
 * A side's directions on the board: `forward` from its baseline toward the far side, and `right` along its baseline to
 * the right of the player sitting there. Side 0 sits at the bottom; the others go round to the right (anticlockwise
 * seen from above): 1 on the right, 2 at the top, 3 on the left.
 */
export interface SideFrame {
  forward: Point;
  right: Point;
}

const FRAMES: readonly SideFrame[] = [
  { forward: { x: 0, y: -1 }, right: { x: 1, y: 0 } },
  { forward: { x: -1, y: 0 }, right: { x: 0, y: -1 } },
  { forward: { x: 0, y: 1 }, right: { x: -1, y: 0 } },
  { forward: { x: 1, y: 0 }, right: { x: 0, y: 1 } },
];

export const sideFrame = (side: CarromSide): SideFrame => FRAMES[side]!;

/** Which side a seat plays from: with 2 players, opposite each other; with 3 or 4, round the board in turn order. */
export function sideOf(players: number, seat: number): CarromSide {
  return (players === 2 ? seat * 2 : seat) as CarromSide;
}

/** The striker's middle on `side`'s baseline, `at` units to the player's right of its middle. */
export function strikerSpot(side: CarromSide, at: number): Point {
  const { forward, right } = sideFrame(side);
  const back = MID - baseline.inset;
  return { x: MID + right.x * at - forward.x * back, y: MID + right.y * at - forward.y * back };
}

/** How far along `side`'s baseline (from its middle, to the player's right) a point lies. */
export function alongBaseline(side: CarromSide, point: Point): number {
  const { right } = sideFrame(side);
  return (point.x - MID) * right.x + (point.y - MID) * right.y;
}

/** Whether the striker may stand at `at` on `side`'s baseline: within it, and not on a coin (classic rule). */
export function strikerFits(coins: readonly CarromCoin[], side: CarromSide, at: number): boolean {
  if (!(Math.abs(at) <= baseline.half)) return false;
  const spot = strikerSpot(side, at);
  const room = RS + RC;
  return coins.every((c) => !c.on || (c.x - spot.x) * (c.x - spot.x) + (c.y - spot.y) * (c.y - spot.y) >= room * room);
}

/**
 * The coins at the start, round the queen in the middle: 6 touching her, then 12 round those, packed like a honeycomb,
 * white and black taking turns all the way round both rings (9 of each). Index 0 is the queen, then the whites, then the
 * blacks.
 */
export function startingCoins(): CarromCoin[] {
  const d = 2 * RC + coinGap;
  const h = (d * Math.sqrt(3)) / 2;
  // The honeycomb's six neighbours of the middle, going round; the outer ring is each of them doubled, and each
  // neighbouring pair added together between them.
  const ring: Point[] = [
    { x: d, y: 0 },
    { x: d / 2, y: h },
    { x: -d / 2, y: h },
    { x: -d, y: 0 },
    { x: -d / 2, y: -h },
    { x: d / 2, y: -h },
  ];
  const outer = ring.flatMap((p, i) => {
    const q = ring[(i + 1) % 6]!;
    return [
      { x: 2 * p.x, y: 2 * p.y },
      { x: p.x + q.x, y: p.y + q.y },
    ];
  });
  const at = (p: Point, kind: CoinKind): CarromCoin => ({ kind, x: MID + p.x, y: MID + p.y, on: true });
  const inner = ring.map((p, i) => at(p, i % 2 === 0 ? "white" : "black"));
  const outerCoins = outer.map((p, i) => at(p, i % 2 === 0 ? "black" : "white"));
  const all = [...inner, ...outerCoins];
  return [at({ x: 0, y: 0 }, "queen"), ...all.filter((c) => c.kind === "white"), ...all.filter((c) => c.kind === "black")];
}

/** Whether a coin could lie at `x, y` without touching a coin on the board or the frame, nor over a hole. */
function roomAt(coins: readonly CarromCoin[], x: number, y: number): boolean {
  if (x < RC || x > S - RC || y < RC || y > S - RC || holeAt(x, y) !== -1) return false;
  const room = 2 * RC + coinGap;
  return coins.every((c) => !c.on || (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y) >= room * room);
}

/** Where a coin put back goes (the queen not covered, a foul's coins): the middle, or the free spot nearest it on a fine grid. */
export function centreSpot(coins: readonly CarromCoin[]): Point {
  if (roomAt(coins, MID, MID)) return { x: MID, y: MID };
  const grid = RC / 2;
  for (let ring = 1; ring < S / grid; ring++) {
    let best: (Point & { d: number }) | null = null;
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const d = i * i + j * j;
        const x = MID + i * grid;
        const y = MID + j * grid;
        if ((best === null || d < best.d) && roomAt(coins, x, y)) best = { x, y, d };
      }
    }
    if (best) return { x: best.x, y: best.y };
  }
  return { x: MID, y: MID };
}
