import { POOL_CONFIG } from "./config";
import { holeAt, inLongMouth, inShortMouth, JAWS, pocketAt } from "./table";
import type { PoolBall, PoolShot, ShotOutcome } from "./types";

/**
 * Pool's physics: balls rolling on cloth, bouncing off each other, the cushions and the jaws, dropping into pockets.
 * Fixed steps, and only adding, multiplying, dividing and square roots (never `Math.sin`, `exp` or the like, which can
 * differ in their last digit between browsers), so the server and every phone get exactly the same shot, to the
 * last digit: a shot is played on each phone from the same start, and nothing ever needs correcting.
 */

const { ballRadius: R, physics: P, pockets } = POOL_CONFIG;
const { length: L, width: W } = POOL_CONFIG.table;
const DT = 1 / P.stepsPerSecond;
const TOUCH = 2 * R;
const JAW_REACH = R + pockets.jawRadius;
const MAX_STEPS = Math.round(P.maxSeconds * P.stepsPerSecond);

/** Something the balls did, for sounds and feels: a ball hit another, a cushion (or a jaw), or dropped. */
export interface ShotEvent {
  step: number;
  kind: "ball" | "cushion" | "pocket";
  /** The ball (by index) and, for two balls, the other. */
  ball: number;
  other?: number;
  /** How hard (units / s along the hit); a drop's: how fast the ball was going. */
  speed: number;
  /** A drop: which pocket. */
  pocket?: number;
}

/** Watches a shot as it is simulated (the phones, to play it out); the server needs none. */
export interface ShotWatcher {
  /** After every step: every ball's middle and whether it's still on the table. */
  step?(step: number, x: Float64Array, y: Float64Array, on: Uint8Array): void;
  event?(event: ShotEvent): void;
}

/**
 * Plays `shot` from `balls` (index 0 is the cue ball) until every ball has stopped: where they all end up, the first
 * ball the cue ball touched, and the balls potted in order.
 */
export function simulate(balls: readonly PoolBall[], shot: PoolShot, watcher: ShotWatcher = {}): { balls: PoolBall[]; outcome: ShotOutcome } {
  const n = balls.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const on = new Uint8Array(n);
  balls.forEach((b, i) => {
    x[i] = b.x;
    y[i] = b.y;
    on[i] = b.on ? 1 : 0;
  });
  const speed = P.maxSpeed * shot.power * Math.sqrt(shot.power);
  vx[0] = shot.dx * speed;
  vy[0] = shot.dy * speed;

  let firstHit: number | null = null;
  const potted: number[] = [];
  let step = 0;
  const emit = (event: ShotEvent) => watcher.event?.(event);
  const moving = (i: number) => vx[i] !== 0 || vy[i] !== 0;

  while (step < MAX_STEPS) {
    step += 1;
    // Roll.
    for (let i = 0; i < n; i++) {
      if (!on[i] || !moving(i)) continue;
      x[i] = x[i]! + vx[i]! * DT;
      y[i] = y[i]! + vy[i]! * DT;
    }
    // Ball on ball: pushed apart, and an equal-mass bounce along the line between their middles.
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!on[j] || (!moving(i) && !moving(j))) continue;
        const dx = x[j]! - x[i]!;
        const dy = y[j]! - y[i]!;
        const d2 = dx * dx + dy * dy;
        if (d2 >= TOUCH * TOUCH) continue;
        const d = Math.sqrt(d2);
        const nx = d === 0 ? 1 : dx / d;
        const ny = d === 0 ? 0 : dy / d;
        const push = (TOUCH - d) / 2;
        x[i] = x[i]! - nx * push;
        y[i] = y[i]! - ny * push;
        x[j] = x[j]! + nx * push;
        y[j] = y[j]! + ny * push;
        const closing = (vx[i]! - vx[j]!) * nx + (vy[i]! - vy[j]!) * ny;
        if (closing <= 0) continue;
        const impulse = (closing * (1 + P.ballBounce)) / 2;
        vx[i] = vx[i]! - impulse * nx;
        vy[i] = vy[i]! - impulse * ny;
        vx[j] = vx[j]! + impulse * nx;
        vy[j] = vy[j]! + impulse * ny;
        if (firstHit === null && (i === 0 || j === 0)) firstHit = i === 0 ? j : i;
        emit({ step, kind: "ball", ball: i, other: j, speed: closing });
      }
    }
    // Cushions, jaws, pockets; then the cloth slows what still rolls.
    for (let i = 0; i < n; i++) {
      if (!on[i] || !moving(i)) continue;
      const bounced = cushions(i, x, y, vx, vy);
      if (bounced > 0) emit({ step, kind: "cushion", ball: i, speed: bounced });
      // Dropped: its middle over a hole, or off the cloth through a mouth.
      const hole = holeAt(x[i]!, y[i]!);
      if (hole !== -1 || x[i]! < 0 || x[i]! > L || y[i]! < 0 || y[i]! > W) {
        on[i] = 0;
        potted.push(i);
        emit({ step, kind: "pocket", ball: i, speed: Math.sqrt(vx[i]! * vx[i]! + vy[i]! * vy[i]!), pocket: hole !== -1 ? hole : pocketAt(x[i]!, y[i]!) });
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      const s = Math.sqrt(vx[i]! * vx[i]! + vy[i]! * vy[i]!);
      const slower = s - (P.rolling + P.drag * s) * DT;
      if (slower <= P.stopSpeed) {
        vx[i] = 0;
        vy[i] = 0;
      } else {
        vx[i] = (vx[i]! * slower) / s;
        vy[i] = (vy[i]! * slower) / s;
      }
    }
    watcher.step?.(step, x, y, on);
    let still = true;
    for (let i = 0; i < n && still; i++) if (on[i] && moving(i)) still = false;
    if (still) break;
  }

  return {
    balls: balls.map((b, i) => ({ owner: b.owner, x: x[i]!, y: y[i]!, on: on[i] === 1 })),
    outcome: { firstHit, potted, steps: step },
  };
}

/** Keeps ball `i` off the cushions and jaws, bouncing it; how hard it hit (0 if it didn't). */
function cushions(i: number, x: Float64Array, y: Float64Array, vx: Float64Array, vy: Float64Array): number {
  let hit = 0;
  if (x[i]! < R && !inShortMouth(y[i]!)) {
    x[i] = R;
    if (vx[i]! < 0) {
      hit = -vx[i]!;
      vx[i] = -vx[i]! * P.cushionBounce;
    }
  } else if (x[i]! > L - R && !inShortMouth(y[i]!)) {
    x[i] = L - R;
    if (vx[i]! > 0) {
      hit = vx[i]!;
      vx[i] = -vx[i]! * P.cushionBounce;
    }
  }
  if (y[i]! < R && !inLongMouth(x[i]!)) {
    y[i] = R;
    if (vy[i]! < 0) {
      hit = Math.max(hit, -vy[i]!);
      vy[i] = -vy[i]! * P.cushionBounce;
    }
  } else if (y[i]! > W - R && !inLongMouth(x[i]!)) {
    y[i] = W - R;
    if (vy[i]! > 0) {
      hit = Math.max(hit, vy[i]!);
      vy[i] = -vy[i]! * P.cushionBounce;
    }
  }
  for (const jaw of JAWS) {
    const dx = x[i]! - jaw.x;
    const dy = y[i]! - jaw.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= JAW_REACH * JAW_REACH || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    x[i] = jaw.x + nx * JAW_REACH;
    y[i] = jaw.y + ny * JAW_REACH;
    const into = vx[i]! * nx + vy[i]! * ny;
    if (into >= 0) continue;
    vx[i] = vx[i]! - (1 + P.jawBounce) * into * nx;
    vy[i] = vy[i]! - (1 + P.jawBounce) * into * ny;
    hit = Math.max(hit, -into);
  }
  return hit;
}
