import { strikerSpot } from "../../../shared/games/carrom/board";
import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import { simulate, type ShotEvent } from "../../../shared/games/carrom/physics";
import type { CarromShotResult } from "../../../shared/games/carrom/types";

/** The screen's frames: the simulation's steps sampled 60 times a second. */
const FRAME_STEPS = CARROM_CONFIG.physics.stepsPerSecond / 60;
const STEP_MS = 1000 / CARROM_CONFIG.physics.stepsPerSecond;
export const FRAME_MS = FRAME_STEPS * STEP_MS;

/** A disc dropping into a hole: where it was as it went over, when (ms into the slide), and which hole. Disc 0 is the striker. */
export interface Drop {
  disc: number;
  pocket: number;
  ms: number;
  x: number;
  y: number;
}

/** A shot as the screen plays it: every disc's place in each frame (the striker first), the drops, and what made a sound when. */
export interface ShotFrames {
  x: Float32Array[];
  y: Float32Array[];
  on: Uint8Array[];
  drops: Drop[];
  events: (ShotEvent & { ms: number })[];
  /** How long the discs slide (ms). */
  slideMs: number;
}

/**
 * Plays a shot again from where the coins lay before it, exactly as the server does (the same code and numbers give
 * the same result to the last digit), keeping a frame every 60th of a second.
 */
export function shotFrames(shot: CarromShotResult): ShotFrames {
  const frames: ShotFrames = { x: [], y: [], on: [], drops: [], events: [], slideMs: 0 };
  const keep = (x: ArrayLike<number>, y: ArrayLike<number>, on: ArrayLike<number>) => {
    frames.x.push(Float32Array.from(x));
    frames.y.push(Float32Array.from(y));
    frames.on.push(Uint8Array.from(on));
  };
  const start = strikerSpot(shot.side, shot.shot.at);
  keep(
    [start.x, ...shot.before.map((c) => c.x)],
    [start.y, ...shot.before.map((c) => c.y)],
    [1, ...shot.before.map((c) => (c.on ? 1 : 0))],
  );
  let dropping: Drop[] = [];
  let kept = 0;
  // The simulation's own arrays (the same ones every step): where everything ended up once it's done.
  const end: { x?: Float64Array; y?: Float64Array; on?: Uint8Array } = {};
  const { outcome } = simulate(shot.before, shot.side, shot.shot, {
    event(event) {
      frames.events.push({ ...event, ms: event.step * STEP_MS });
      if (event.kind === "pocket") dropping.push({ disc: event.disc, pocket: event.pocket!, ms: event.step * STEP_MS, x: 0, y: 0 });
    },
    step(step, x, y, on) {
      for (const drop of dropping) frames.drops.push({ ...drop, x: x[drop.disc]!, y: y[drop.disc]! });
      dropping = [];
      Object.assign(end, { x, y, on });
      if (step % FRAME_STEPS !== 0) return;
      keep(x, y, on);
      kept = step;
    },
  });
  if (kept !== outcome.steps && end.x && end.y && end.on) keep(end.x, end.y, end.on);
  frames.slideMs = outcome.steps * STEP_MS;
  return frames;
}

/** Every disc's place `ms` into the slide, between the two nearest frames. */
export function discsAt(frames: ShotFrames, ms: number): { x: number[]; y: number[]; on: boolean[] } {
  const last = frames.x.length - 1;
  const at = Math.min(Math.max(ms / FRAME_MS, 0), last);
  const i = Math.floor(at);
  const j = Math.min(i + 1, last);
  const t = at - i;
  const x: number[] = [];
  const y: number[] = [];
  const on: boolean[] = [];
  for (let d = 0; d < frames.x[0]!.length; d++) {
    x.push(frames.x[i]![d]! + (frames.x[j]![d]! - frames.x[i]![d]!) * t);
    y.push(frames.y[i]![d]! + (frames.y[j]![d]! - frames.y[i]![d]!) * t);
    on.push(frames.on[t === 0 ? i : j]![d] === 1);
  }
  return { x, y, on };
}
