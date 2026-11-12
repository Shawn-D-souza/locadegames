import type { Seat } from "../../../../shared/games/types";
import type { Layout, Motion, Phase, RoundHit } from "../../../../shared/games/headcrash/types";

/** Everything one drawn frame needs, in world units (meters, y up). Built by the client engine, drawn by the renderer. */

export interface CarView {
  x: number;
  y: number;
  /** Radians, counter-clockwise. */
  angle: number;
  vx: number;
  vy: number;
  /** A wheel is on the ground (dust, engine). */
  grounded: boolean;
  /** Buttons held. */
  buttons: number;
}

/** The hit that ended the round, once the server has said so, and when it showed here (performance.now). */
export interface HitView extends RoundHit {
  round: number;
  shownAt: number;
}

export interface FrameView {
  layout: Layout;
  round: number;
  phase: Phase;
  /** By seat. */
  cars: [CarView, CarView];
  waterY: number;
  /** Where the lifts are. */
  motion: Motion;
  /** The water has started to rise. */
  waterRising: boolean;
  hit: HitView | null;
  /** When this round was first drawn (performance.now). */
  roundShownAt: number;
}

/** Something happened in the match: collected by the client for whoever reacts to it (the sound), taken once. */
export type MomentView =
  /** The countdown ended. */
  | { kind: "go"; at: number }
  /** A head was hit (the server said so): who scored, if anyone. */
  | { kind: "hit"; hit: RoundHit; scorer: Seat | null; at: number }
  /** A car came down on its wheels after `airTicks` steps in the air, this hard (speed change, m/s). */
  | { kind: "land"; seat: Seat; impact: number; airTicks: number; at: number }
  /** A car's body (not its wheels) hit the arena this hard: a wall, the roof, a lift's side (speed change, m/s). */
  | { kind: "knock"; seat: Seat; impact: number; at: number }
  /** A bounce pad threw a car up. */
  | { kind: "pad"; seat: Seat; at: number }
  /** A car went into a fan's rising air. */
  | { kind: "fan"; seat: Seat; at: number }
  /** The cars knocked into each other. */
  | { kind: "bump"; impact: number; at: number };

/** The overlay's numbers. */
export interface HudView {
  synced: boolean;
  score: [number, number];
  /** 3, 2, 1 while counting down, else 0. */
  countdown: number;
  phase: Phase;
  round: number;
  waterRising: boolean;
}
