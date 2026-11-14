import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { simulate, type ShotEvent } from "../../../shared/games/pool/physics";
import type { PoolShotResult } from "../../../shared/games/pool/types";

/** The screen's frames: the simulation's steps sampled 60 times a second. */
const FRAME_STEPS = POOL_CONFIG.physics.stepsPerSecond / 60;
const STEP_MS = 1000 / POOL_CONFIG.physics.stepsPerSecond;
export const FRAME_MS = FRAME_STEPS * STEP_MS;

/** A ball dropping into a pocket: where it crossed the cushion line, when (ms into the roll), and which pocket. */
export interface Drop {
  ball: number;
  pocket: number;
  ms: number;
  x: number;
  y: number;
}

/** A shot as the screen plays it: every ball's place in each frame, the drops, and what made a sound when. */
export interface ShotFrames {
  x: Float32Array[];
  y: Float32Array[];
  on: Uint8Array[];
  drops: Drop[];
  events: (ShotEvent & { ms: number })[];
  /** How long the balls roll (ms). */
  rollMs: number;
}

/**
 * Plays a shot again from where the balls stood before it, exactly as the server did (the same code and numbers give
 * the same result to the last digit), keeping a frame every 60th of a second.
 */
export function shotFrames(shot: PoolShotResult): ShotFrames {
  const frames: ShotFrames = { x: [], y: [], on: [], drops: [], events: [], rollMs: 0 };
  const keep = (x: ArrayLike<number>, y: ArrayLike<number>, on: ArrayLike<number>) => {
    frames.x.push(Float32Array.from(x));
    frames.y.push(Float32Array.from(y));
    frames.on.push(Uint8Array.from(on));
  };
  keep(
    shot.before.map((b) => b.x),
    shot.before.map((b) => b.y),
    shot.before.map((b) => (b.on ? 1 : 0)),
  );
  // Drops found this step: the step's end says where the ball crossed the line (a potted ball is left there).
  let dropping: Drop[] = [];
  let kept = 0;
  const { balls, outcome } = simulate(shot.before, shot.shot, {
    event(event) {
      frames.events.push({ ...event, ms: event.step * STEP_MS });
      if (event.kind === "pocket") dropping.push({ ball: event.ball, pocket: event.pocket!, ms: event.step * STEP_MS, x: 0, y: 0 });
    },
    step(step, x, y, on) {
      for (const drop of dropping) frames.drops.push({ ...drop, x: x[drop.ball]!, y: y[drop.ball]! });
      dropping = [];
      if (step % FRAME_STEPS !== 0) return;
      keep(x, y, on);
      kept = step;
    },
  });
  if (kept !== outcome.steps) {
    keep(
      balls.map((b) => b.x),
      balls.map((b) => b.y),
      balls.map((b) => (b.on ? 1 : 0)),
    );
  }
  frames.rollMs = outcome.steps * STEP_MS;
  return frames;
}

/** Every ball's place `ms` into the roll, between the two nearest frames. */
export function ballsAt(frames: ShotFrames, ms: number): { x: number[]; y: number[]; on: boolean[] } {
  const last = frames.x.length - 1;
  const at = Math.min(Math.max(ms / FRAME_MS, 0), last);
  const i = Math.floor(at);
  const j = Math.min(i + 1, last);
  const t = at - i;
  const x: number[] = [];
  const y: number[] = [];
  const on: boolean[] = [];
  for (let b = 0; b < frames.x[0]!.length; b++) {
    x.push(frames.x[i]![b]! + (frames.x[j]![b]! - frames.x[i]![b]!) * t);
    y.push(frames.y[i]![b]! + (frames.y[j]![b]! - frames.y[i]![b]!) * t);
    // A ball is gone from the frame it dropped in.
    on.push(frames.on[t === 0 ? i : j]![b] === 1);
  }
  return { x, y, on };
}
