import { squareCell } from "../../../shared/games/snakesladders/board";
import { SNAKESLADDERS_CONFIG } from "../../../shared/games/snakesladders/config";
import type { SnakesRoll } from "../../../shared/games/snakesladders/types";

/**
 * Where things are on the board, in board units: the board is 100 across and 100 down (a square is 10), the same
 * numbers the SVG's viewBox and the pieces' percentages use. Pure: the board's art and every piece's motion come from
 * here, so a piece slides down exactly the snake that's drawn.
 */

export interface Point {
  x: number;
  y: number;
}

/** One square, in board units. */
export const SQUARE = 100 / SNAKESLADDERS_CONFIG.columns;

/** The middle of `square` (1–100). Square 0, before a piece's first roll, is square 1: it pops in there. */
export function squareCenter(square: number): Point {
  const { col, row } = squareCell(Math.max(1, square));
  return { x: (col + 0.5) * SQUARE, y: (SNAKESLADDERS_CONFIG.columns - row - 0.5) * SQUARE };
}

/**
 * Snakes, in board units (owner direction 2026-11-14: slim, so they read as snakes, not worms): how far the body sways
 * either side of the straight line and over what length one wave goes; the head's size; the body's half-width, how
 * slim its neck is (a share of it) and over what length it widens, where the tail starts to taper and its tip. Its
 * skin is in `snakeSkin.ts`.
 */
const SNAKE = {
  sway: 2.6,
  waveLength: 22,
  points: 72,
  head: 1.95,
  body: 1.3,
  neck: 0.75,
  neckTo: 0.07,
  taperFrom: 0.42,
  tip: 0.16,
} as const;

/** Ladders: half the gap between the rails, and the distance between rungs. */
export const LADDER = { halfWidth: 2.3, rungGap: 4.6 } as const;

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A unit vector at right angles to the line from `a` to `b`. */
function normal(a: Point, b: Point): Point {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
}

/**
 * A snake's spine from its head (on `head`) to the tip of its tail (on `tail`): it sways side to side, more in the
 * middle, and settles back onto the straight line at both ends, so its head and tail sit in the middle of their squares.
 * The sway's side alternates with the head square, so neighbouring snakes don't all bend alike.
 */
export function snakeSpine(head: number, tail: number): Point[] {
  return spineBetween(squareCenter(head), squareCenter(tail), head % 2 === 0 ? 1 : -1);
}

/** A snake's spine between two points (`side`: which way its first bend goes, 1 or -1). */
export function spineBetween(from: Point, to: Point, side: number): Point[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const waves = Math.max(1, Math.round(length / SNAKE.waveLength));
  const n = normal(from, to);
  return Array.from({ length: SNAKE.points + 1 }, (_, i) => {
    const t = i / SNAKE.points;
    const along = lerp(from, to, t);
    const sway = side * SNAKE.sway * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * waves * t);
    return { x: along.x + n.x * sway, y: along.y + n.y * sway };
  });
}

/**
 * How thick the snake is at `t` (0 = behind its head, 1 = the tail's tip), like a real snake: a slim neck behind the
 * wider head, then the body, then a long, smooth taper to a fine tail.
 */
export function snakeWidth(t: number): number {
  if (t < SNAKE.neckTo) return SNAKE.body * (SNAKE.neck + (1 - SNAKE.neck) * Math.sin(((t / SNAKE.neckTo) * Math.PI) / 2));
  if (t <= SNAKE.taperFrom) return SNAKE.body;
  const u = (t - SNAKE.taperFrom) / (1 - SNAKE.taperFrom);
  return SNAKE.tip + (SNAKE.body - SNAKE.tip) * Math.cos((u * Math.PI) / 2);
}

/** The direction across the body at point `i` of the spine (a unit vector to its left). */
export function across(spine: readonly Point[], i: number): Point {
  return normal(spine[Math.max(0, i - 1)]!, spine[Math.min(spine.length - 1, i + 1)]!);
}

/** The snake's body as a closed SVG path: both sides of the spine at its width (or `share` of it, between `from` and `to` along it: a stripe down its back). */
export function snakeBodyPath(spine: readonly Point[], share = 1, from = 0, to = 1): string {
  const left: Point[] = [];
  const right: Point[] = [];
  spine.forEach((p, i) => {
    const t = i / (spine.length - 1);
    if (t < from || t > to) return;
    const n = across(spine, i);
    const w = snakeWidth(t) * share;
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  const points = [...left, ...right.reverse()];
  return `M${points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("L")}Z`;
}

/** The snake's head: where it sits, which way it faces (away from its body), and its size. */
export function snakeHead(spine: readonly Point[]): { at: Point; angle: number; radius: number } {
  const at = spine[0]!;
  const next = spine[2]!;
  return { at, angle: (Math.atan2(at.y - next.y, at.x - next.x) * 180) / Math.PI, radius: SNAKE.head };
}

/** How long a path of points is. */
export function pathLength(path: readonly Point[]): number {
  return path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y), 0);
}

/** A ladder from its foot to its top (the middles of their squares): two rails and the rungs between them, in board units. */
export function ladderParts(from: Point, to: Point): { rails: [Point, Point][]; rungs: [Point, Point][] } {
  const n = normal(from, to);
  const side = (p: Point, s: number): Point => ({ x: p.x + n.x * LADDER.halfWidth * s, y: p.y + n.y * LADDER.halfWidth * s });
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const count = Math.max(2, Math.round(length / LADDER.rungGap));
  const rungs = Array.from({ length: count }, (_, i) => {
    const at = lerp(from, to, (i + 0.5) / count);
    return [side(at, 1), side(at, -1)] as [Point, Point];
  });
  return { rails: [[side(from, 1), side(to, 1)], [side(from, -1), side(to, -1)]], rungs };
}

/** A point `t` (0–1) of the way along a path of points, by distance. */
export function alongPath(path: readonly Point[], t: number): Point {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  let left = Math.max(0, Math.min(1, t)) * lengths.reduce((sum, l) => sum + l, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]! || i === lengths.length - 1) return lerp(path[i]!, path[i + 1]!, lengths[i]! === 0 ? 0 : Math.min(1, left / lengths[i]!));
    left -= lengths[i]!;
  }
  return path[0]!;
}

/**
 * The moving piece at one moment: where, how high it is off the board (0 resting), how big (0 not on the board), how
 * squashed (0 round; it flattens as it lands from a hop or at the end of a climb or slide), and which stage it's in.
 */
export interface PiecePose extends Point {
  lift: number;
  scale: number;
  squash: number;
  stage: "die" | "hop" | "climb" | "slide" | "stuck" | "back" | "done";
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
/** Slow at the top, gathering speed, easing off only at the very end: a slide down a snake. */
const easeSlide = (t: number) => (t < 0.85 ? 0.9 * (t / 0.85) ** 1.8 : 0.9 + 0.1 * Math.sin(((t - 0.85) / 0.15) * (Math.PI / 2)));
/** How far a piece rises off the board on a hop, and on the long flight back after three 6s, in board units. */
const HOP_LIFT = 4.2;
const BACK_LIFT = 16;
/** A hop: the share of it spent in the air (the rest it sits squashed on its new square), and how flat it lands. */
const HOP_AIR = 0.78;
const LAND_SQUASH = 0.22;
/** The end of a climb or a slide: the share of it the piece spends landing, squashed (its sound lands as this starts). */
export const ARRIVE = 0.14;
/** The stuck piece's shake: how far each way, and how many times. */
const SHAKE = { reach: 1.6, times: 3 } as const;

/** A squash that pops up and springs back over `u` 0–1. */
const bump = (u: number, depth: number) => depth * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));

/**
 * Where a rolled piece is `ms` after its roll arrived: the die tumbles and shows its face a moment, then the piece hops
 * square by square (popping on at square 1 if it wasn't on the board), each hop an arc that lands with a squash, then
 * climbs its ladder or slides down its snake (gathering speed) and lands; or it shakes where it is (a roll too big to
 * finish), or flies back where its turn began (three 6s). The stages' lengths are the shared ones (`rollMs`), which
 * the server waits for before the next turn's clock starts.
 */
export function pieceAt(roll: SnakesRoll, ms: number): PiecePose {
  const { dieMs, settleMs, hopMs, climbMs, slideMs, stuckMs, backMs } = SNAKESLADDERS_CONFIG;
  const rest = (square: number, stage: PiecePose["stage"]): PiecePose => ({
    ...squareCenter(square),
    lift: 0,
    scale: square === 0 ? 0 : 1,
    squash: 0,
    stage,
  });
  if (ms < dieMs + settleMs) return rest(roll.from, "die");
  const t = ms - dieMs - settleMs;
  if (roll.kind === "stuck") {
    if (t >= stuckMs) return rest(roll.from, "done");
    const u = t / stuckMs;
    const at = squareCenter(roll.from);
    return { ...at, x: at.x + SHAKE.reach * Math.sin(u * Math.PI * 2 * SHAKE.times) * (1 - u), lift: 0, scale: 1, squash: 0, stage: "stuck" };
  }
  if (roll.kind === "threeSixes") {
    if (t >= backMs) return rest(roll.to, "done");
    const u = Math.min(1, t / (backMs * (1 - ARRIVE)));
    const at = lerp(squareCenter(roll.from), squareCenter(roll.to), easeInOut(u));
    // Back off the board altogether: it shrinks away as it lands on square 1.
    const scale = roll.to === 0 ? 1 - u : 1;
    return { ...at, lift: BACK_LIFT * Math.sin(Math.PI * u), scale, squash: u >= 1 ? bump((t / backMs - (1 - ARRIVE)) / ARRIVE, LAND_SQUASH) : 0, stage: "back" };
  }
  const steps = roll.landed - roll.from;
  if (t < steps * hopMs) {
    const index = Math.floor(t / hopMs);
    const u = (t - index * hopMs) / hopMs;
    const from = roll.from + index;
    const air = Math.min(1, u / HOP_AIR);
    const at = lerp(squareCenter(from), squareCenter(from + 1), from === 0 ? 1 : easeInOut(air));
    return {
      ...at,
      lift: HOP_LIFT * Math.sin(Math.PI * air),
      scale: from === 0 ? Math.min(1, air * 1.4) : 1,
      squash: u > HOP_AIR ? bump((u - HOP_AIR) / (1 - HOP_AIR), LAND_SQUASH) : 0,
      stage: "hop",
    };
  }
  const after = t - steps * hopMs;
  if (roll.kind === "ladder" && after < climbMs) {
    const u = Math.min(1, after / (climbMs * (1 - ARRIVE)));
    const at = lerp(squareCenter(roll.landed), squareCenter(roll.to), easeInOut(u));
    return { ...at, lift: 0, scale: 1, squash: u >= 1 ? bump((after / climbMs - (1 - ARRIVE)) / ARRIVE, LAND_SQUASH) : 0, stage: "climb" };
  }
  if (roll.kind === "snake" && after < slideMs) {
    const u = Math.min(1, after / (slideMs * (1 - ARRIVE)));
    const at = alongPath(snakeSpine(roll.landed, roll.to), easeSlide(u));
    return { ...at, lift: 0, scale: 1, squash: u >= 1 ? bump((after / slideMs - (1 - ARRIVE)) / ARRIVE, LAND_SQUASH) : 0, stage: "slide" };
  }
  return rest(roll.to, "done");
}

/**
 * Where each of `count` pieces sharing a square sits, around its middle, and how big they are there: one in the
 * middle, two side by side, up to four in a square, more in a 3 × 3 grid, smaller.
 */
export function clusterSpots(count: number): { offsets: Point[]; scale: number } {
  if (count <= 1) return { offsets: [{ x: 0, y: 0 }], scale: 1 };
  const reach = SQUARE * (count <= 4 ? 0.22 : 0.28);
  const grid = count === 2 ? [[-1, 0], [1, 0]] : count <= 4 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => [x, y]));
  return { offsets: grid.slice(0, count).map(([x, y]) => ({ x: x! * reach, y: y! * reach })), scale: count <= 2 ? 0.8 : count <= 4 ? 0.66 : 0.5 };
}
