import { LUDO_CONFIG, stepMs } from "../../../shared/games/ludo/config";
import type { LudoAction } from "../../../shared/games/ludo/types";
import { spotOf, type LudoLayout, type Point } from "./geometry";

/**
 * A pawn in motion at one moment, in board units: where its middle is, how high off the board (it rises on screen),
 * and how squashed (0 round; it flattens onto its base as it lands).
 */
export interface PawnPose {
  at: Point;
  lift: number;
  squash: number;
}

/** How high a pawn rises on a hop, flying out of its base, and flying back to it captured: in squares. */
const LIFT = { hop: 0.55, enter: 1.1, captured: 2.4 } as const;
/** A hop: the share of it spent in the air (the rest it sits squashed on its new square), and how flat it lands. */
const HOP_AIR = 0.78;
const LAND_SQUASH = 0.22;

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
/** A squash that pops up and springs back over `u` 0–1. */
const bump = (u: number) => LAND_SQUASH * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));

/** A flight from `from` to `to` over `u` 0–1, rising `lift` squares at its top, landing with a squash in its last share. */
function flight(from: Point, to: Point, u: number, lift: number, cell: number): PawnPose {
  const air = Math.min(1, u / HOP_AIR);
  return { at: lerp(from, to, easeInOut(air)), lift: lift * cell * Math.sin(Math.PI * air), squash: u > HOP_AIR ? bump((u - HOP_AIR) / (1 - HOP_AIR)) : 0 };
}

/** When the pawn starts moving in an action: after the die has shown (when it was rolled). */
export function stepStartMs(action: LudoAction): number {
  return action.rolled ? LUDO_CONFIG.dieMs + LUDO_CONFIG.settleMs : 0;
}

/**
 * Where the pawns an action moves are `ms` after it arrived, keyed `seat:pawn` (the rest stand where they are): the die
 * shows first (if it was rolled); then the pawn flies out of its base onto its start square, or hops square by square,
 * each hop an arc landing with a squash; then any pawns it captured fly back to their bases. `armOf` gives each seat's
 * arm. Those not moving yet stand where they were.
 */
export function movingPawns(action: LudoAction, layout: LudoLayout, armOf: (seat: number) => number, ms: number): Map<string, PawnPose> {
  const poses = new Map<string, PawnPose>();
  const step = action.step;
  if (!step) return poses;
  const { hopMs, enterMs } = LUDO_CONFIG;
  const cell = layout.cell;
  const arm = armOf(action.seat);
  const spot = (progress: number) => spotOf(layout, arm, step.pawn, progress);
  const t = ms - stepStartMs(action);
  const moveMs = step.from < 0 ? enterMs : (step.to - step.from) * hopMs;
  let mover: PawnPose;
  if (t < 0) mover = { at: spot(step.from), lift: 0, squash: 0 };
  else if (t >= moveMs) mover = { at: spot(step.to), lift: 0, squash: 0 };
  else if (step.from < 0) mover = flight(spot(-1), spot(0), t / enterMs, LIFT.enter, cell);
  else {
    const hop = Math.floor(t / hopMs);
    mover = flight(spot(step.from + hop), spot(step.from + hop + 1), (t - hop * hopMs) / hopMs, LIFT.hop, cell);
  }
  poses.set(`${action.seat}:${step.pawn}`, mover);
  const flyFrom = moveMs;
  for (const c of step.captured) {
    const home = armOf(c.seat);
    const from = spotOf(layout, home, c.pawn, c.from);
    const to = spotOf(layout, home, c.pawn, -1);
    const u = (t - flyFrom) / (stepMs(step) - flyFrom);
    poses.set(`${c.seat}:${c.pawn}`, u <= 0 ? { at: from, lift: 0, squash: 0 } : u >= 1 ? { at: to, lift: 0, squash: 0 } : flight(from, to, u, LIFT.captured, cell));
  }
  return poses;
}
