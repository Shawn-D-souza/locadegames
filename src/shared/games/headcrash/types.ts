import type { Seat } from "../types";

export interface Point {
  x: number;
  y: number;
}

/** A car as one rigid body: where its middle is, how it is turned (radians, counter-clockwise), and how it moves. */
export interface Car {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  /** Spin, radians a second (counter-clockwise). */
  spin: number;
}

/** What a piece of ground is made of: rock, or a bounce pad (throws a car off it). */
export const SURFACE = { rock: 0, pad: 1 } as const;
export type Surface = (typeof SURFACE)[keyof typeof SURFACE];

/** One straight piece of the ground's outline, with what collisions need worked out once. */
export interface WallEdge {
  ax: number;
  ay: number;
  /** Unit direction from a to b, and the length. */
  dx: number;
  dy: number;
  length: number;
  /** Unit normal pointing into the open air (away from the ground). */
  nx: number;
  ny: number;
  /** The piece before this one on the same outline (index into the layout's `edges`). */
  previous: number;
  /** The corner at `a` sticks out into the air (a car can touch the corner itself). */
  cornerAtStart: boolean;
  surface: Surface;
}

export interface WallGrid {
  /** Bottom-left corner, square size, and how many squares. */
  x: number;
  y: number;
  cell: number;
  columns: number;
  rows: number;
  /** Per square (row by row): indexes into the layout's `edges`. */
  cells: number[][];
}

/** A floating rectangle. */
export interface Block {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  angle: number;
  cos: number;
  sin: number;
}

/** A lift: a slab that rides up and down by itself, on a fixed timetable from the start of play. */
export interface Lift {
  x: number;
  /** Its middle's height at the bottom and at the top. */
  low: number;
  high: number;
  halfWidth: number;
  halfHeight: number;
}

/** What moves in the map at a moment: how long the round has been played (where the lifts are). */
export interface Motion {
  playTicks: number;
}

/** A fan: air blowing up through this box, strongest at its bottom. */
export interface Fan {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * One round's map: the ground (closed outlines), floating planks and where the cars start. The same on both halves, so
 * it is fair. A cave has ground all round its play space; an open map is islands and cliffs in the sky, and a car
 * that falls off one lands in the water.
 */
export interface Layout {
  /** Which map this is. */
  name: string;
  /**
   * The ground's outlines, each walked with the open air on its left: a cave's play space counter-clockwise, every
   * solid piece (island, cliff, rock) clockwise.
   */
  outlines: Point[][];
  /** What each outline is made of. */
  surfaces: Surface[];
  /** Whether the first outline is a cave's play space (ground everywhere outside it) or the world is open sky. */
  cave: boolean;
  edges: WallEdge[];
  blocks: Block[];
  lifts: Lift[];
  fans: Fan[];
  /** Which pieces of ground are near each square of a grid over the map, so a collision looks at a handful, not all. */
  grid: WallGrid;
  /** Start poses: seat 0 on the left, seat 1 on the right. */
  spawns: [Car, Car];
  /** The frame every screen shows whole (the rest of the screen is more of the same world): its sides, its bottom (where the water starts) and its top. */
  minX: number;
  maxX: number;
  floorY: number;
  topY: number;
}

export const PHASE = {
  /** 3, 2, 1: cars wait on their starts. */
  countdown: 0,
  play: 1,
  /** A head was hit: everything holds still, then the next round. */
  hit: 2,
  /** The match is over. */
  over: 3,
} as const;
export type Phase = (typeof PHASE)[keyof typeof PHASE];

/** What touched a head. */
export const HIT_CAUSE = { car: 0, arena: 1, water: 2 } as const;
export type HitCause = (typeof HIT_CAUSE)[keyof typeof HIT_CAUSE];

/** The hit that ended the round. */
export interface Hit {
  /** Whose head was hit, per seat (both: nobody scores). */
  victims: [boolean, boolean];
  cause: HitCause;
  /** Where, for the effect. */
  x: number;
  y: number;
}

/** The hit as the match keeps it: with how high the water stood and how long the round had been played, so the water and the lifts stay there until the next round. */
export interface RoundHit extends Hit {
  waterY: number;
  playTicks: number;
}

/** A whole match: every round, the score and both cars. Stepping it is pure: this + buttons → the next step. */
export interface HeadCrashState {
  /** Picks the arena of every round. */
  seed: number;
  tick: number;
  /** Which arena (rounds played so far, with or without a point). */
  round: number;
  phase: Phase;
  /** Steps left of the countdown or the pause; steps played so far while playing. */
  phaseTicks: number;
  score: [number, number];
  /** Rounds in a row that ended without a point. */
  deadRounds: number;
  cars: [Car, Car];
  /** Buttons held, per seat. */
  buttons: [number, number];
  /** Set while the phase is `hit` or `over`. */
  hit: RoundHit | null;
}

/** How a finished match ended. */
export type HeadCrashOutcome = { kind: "win"; seat: Seat } | { kind: "draw" };
