import { holeAt, POCKETS, strikerSpot } from "./board";
import { CARROM_CONFIG } from "./config";
import type { CarromCoin, CarromShot, CarromSide, ShotOutcome } from "./types";

/**
 * Carrom's physics: discs sliding on a powdered board, bouncing off each other (the striker heavier than a coin) and the
 * frame, dropping into the corner holes (or, too fast and off-centre, clipping a hole's rim and bouncing out). Fixed steps, and only adding, multiplying, dividing and square roots (never
 * `Math.sin`, `exp` or the like, which can differ in their last digit between browsers), so the server and every phone
 * get exactly the same shot, to the last digit. That's what lets the shooter's phone play a shot the moment it's
 * flicked: the server's result will be the same.
 */

const { coinRadius: RC, strikerRadius: RS, physics: P, rim: RIM } = CARROM_CONFIG;
const S = CARROM_CONFIG.board.size;
const DT = 1 / P.stepsPerSecond;
const MAX_STEPS = Math.round(P.maxSeconds * P.stepsPerSecond);

/** Something the discs did, for sounds and feels: a disc hit another, the frame, or dropped. Disc 0 is the striker, then coin i is disc i + 1. */
export interface ShotEvent {
  step: number;
  kind: "disc" | "wall" | "pocket";
  disc: number;
  other?: number;
  /** How hard (units / s along the hit); a drop's: how fast the disc was going. */
  speed: number;
  /** A drop: which pocket. */
  pocket?: number;
}

/** Watches a shot as it is simulated (the phones, to play it out); the server needs none. */
export interface ShotWatcher {
  /** After every step: every disc's middle (the striker first) and whether it's still on the board. */
  step?(step: number, x: Float64Array, y: Float64Array, on: Uint8Array): void;
  event?(event: ShotEvent): void;
}

/** A shot's speed for its power (0 … 1): growing as power^1.5. */
export const speedOf = (power: number) => P.maxSpeed * power * Math.sqrt(power);

/**
 * Plays `shot` from `side`'s baseline with `coins` where they lie, until every disc has stopped: where the coins end up,
 * which went in (in order), and whether the striker did.
 */
export function simulate(coins: readonly CarromCoin[], side: CarromSide, shot: CarromShot, watcher: ShotWatcher = {}): { coins: CarromCoin[]; outcome: ShotOutcome } {
  const n = coins.length + 1;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const on = new Uint8Array(n);
  const r = new Float64Array(n);
  /** One over the mass: how much a push moves it. */
  const w = new Float64Array(n);
  const start = strikerSpot(side, shot.at);
  x[0] = start.x;
  y[0] = start.y;
  on[0] = 1;
  r[0] = RS;
  w[0] = 1 / P.strikerMass;
  coins.forEach((c, i) => {
    x[i + 1] = c.x;
    y[i + 1] = c.y;
    on[i + 1] = c.on ? 1 : 0;
    r[i + 1] = RC;
    w[i + 1] = 1 / P.coinMass;
  });
  const speed = speedOf(shot.power);
  vx[0] = shot.dx * speed;
  vy[0] = shot.dy * speed;

  const pocketed: number[] = [];
  let strikerIn = false;
  let step = 0;
  const emit = (event: ShotEvent) => watcher.event?.(event);
  const moving = (i: number) => vx[i] !== 0 || vy[i] !== 0;

  while (step < MAX_STEPS) {
    step += 1;
    // Slide.
    for (let i = 0; i < n; i++) {
      if (!on[i] || !moving(i)) continue;
      x[i] = x[i]! + vx[i]! * DT;
      y[i] = y[i]! + vy[i]! * DT;
    }
    // Disc on disc: pushed apart (the lighter further) and a bounce along the line between their middles.
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!on[j] || (!moving(i) && !moving(j))) continue;
        const dx = x[j]! - x[i]!;
        const dy = y[j]! - y[i]!;
        const touch = r[i]! + r[j]!;
        const d2 = dx * dx + dy * dy;
        if (d2 >= touch * touch) continue;
        const d = Math.sqrt(d2);
        const nx = d === 0 ? 1 : dx / d;
        const ny = d === 0 ? 0 : dy / d;
        const share = (touch - d) / (w[i]! + w[j]!);
        x[i] = x[i]! - nx * share * w[i]!;
        y[i] = y[i]! - ny * share * w[i]!;
        x[j] = x[j]! + nx * share * w[j]!;
        y[j] = y[j]! + ny * share * w[j]!;
        const closing = (vx[i]! - vx[j]!) * nx + (vy[i]! - vy[j]!) * ny;
        if (closing <= 0) continue;
        const impulse = (closing * (1 + P.discBounce)) / (w[i]! + w[j]!);
        vx[i] = vx[i]! - impulse * w[i]! * nx;
        vy[i] = vy[i]! - impulse * w[i]! * ny;
        vx[j] = vx[j]! + impulse * w[j]! * nx;
        vy[j] = vy[j]! + impulse * w[j]! * ny;
        emit({ step, kind: "disc", disc: i, other: j, speed: closing });
      }
    }
    // The frame, the holes; then the board slows what still slides.
    for (let i = 0; i < n; i++) {
      if (!on[i] || !moving(i)) continue;
      const bounced = walls(i, r[i]!, x, y, vx, vy);
      if (bounced > 0) emit({ step, kind: "wall", disc: i, speed: bounced });
      const hole = holeAt(x[i]!, y[i]!);
      const rim = hole === -1 ? null : rimOut(i, hole, x, y, vx, vy);
      if (rim !== null) {
        emit({ step, kind: "wall", disc: i, speed: rim });
      } else if (hole !== -1) {
        on[i] = 0;
        if (i === 0) strikerIn = true;
        else pocketed.push(i - 1);
        emit({ step, kind: "pocket", disc: i, speed: Math.sqrt(vx[i]! * vx[i]! + vy[i]! * vy[i]!), pocket: hole });
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      const s = Math.sqrt(vx[i]! * vx[i]! + vy[i]! * vy[i]!);
      const slower = s - (P.friction + P.drag * s) * DT;
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
    coins: coins.map((c, i) => ({ kind: c.kind, x: x[i + 1]!, y: y[i + 1]!, on: on[i + 1] === 1 })),
    outcome: { pocketed, strikerIn, steps: step },
  };
}

/**
 * Disc `i` just got over hole `hole`: whether it clips the rim and bounces back out instead of dropping (too fast for
 * how far off the hole's middle its path runs). If so it's put back on the rim, its speed into the hole bounced back
 * out, and this says how hard it hit (for the sound); null if it drops.
 */
function rimOut(i: number, hole: number, x: Float64Array, y: Float64Array, vx: Float64Array, vy: Float64Array): number | null {
  const s = Math.sqrt(vx[i]! * vx[i]! + vy[i]! * vy[i]!);
  if (s <= RIM.slowSpeed) return null;
  const h = POCKETS[hole]!;
  const dx = x[i]! - h.x;
  const dy = y[i]! - h.y;
  // How far the path runs from the hole's middle, against how far it may at this speed.
  const offPath = Math.abs(dx * vy[i]! - dy * vx[i]!) / s;
  const t = Math.min(1, (s - RIM.slowSpeed) / (RIM.fastSpeed - RIM.slowSpeed));
  if (offPath <= h.r * (1 - (1 - RIM.fastShare) * t)) return null;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = d === 0 ? 1 : dx / d;
  const ny = d === 0 ? 0 : dy / d;
  const into = vx[i]! * nx + vy[i]! * ny;
  x[i] = h.x + nx * h.r;
  y[i] = h.y + ny * h.r;
  if (into < 0) {
    vx[i] = vx[i]! - (1 + RIM.bounce) * into * nx;
    vy[i] = vy[i]! - (1 + RIM.bounce) * into * ny;
  }
  return Math.max(0, -into);
}

/** Keeps disc `i` (radius `radius`) inside the frame, bouncing it; how hard it hit (0 if it didn't). */
function walls(i: number, radius: number, x: Float64Array, y: Float64Array, vx: Float64Array, vy: Float64Array): number {
  let hit = 0;
  if (x[i]! < radius) {
    x[i] = radius;
    if (vx[i]! < 0) {
      hit = -vx[i]!;
      vx[i] = -vx[i]! * P.wallBounce;
    }
  } else if (x[i]! > S - radius) {
    x[i] = S - radius;
    if (vx[i]! > 0) {
      hit = vx[i]!;
      vx[i] = -vx[i]! * P.wallBounce;
    }
  }
  if (y[i]! < radius) {
    y[i] = radius;
    if (vy[i]! < 0) {
      hit = Math.max(hit, -vy[i]!);
      vy[i] = -vy[i]! * P.wallBounce;
    }
  } else if (y[i]! > S - radius) {
    y[i] = S - radius;
    if (vy[i]! > 0) {
      hit = Math.max(hit, vy[i]!);
      vy[i] = -vy[i]! * P.wallBounce;
    }
  }
  return hit;
}
