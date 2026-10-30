import { CLIENT_CONFIG } from "../config";

/**
 * Pure particle physics for celebrations: spawn functions build particles with a birth time, and
 * `stepParticle` moves one forward. Drawing lives in the `Particles` component.
 */

export type ParticleKind = "confetti" | "spark" | "star";

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation in radians and its speed per second. */
  angle: number;
  spin: number;
  /** Confetti flutter: the piece turns over (3D flip) at this phase and speed. */
  flip: number;
  flipSpeed: number;
  size: number;
  color: string;
  bornMs: number;
  lifeMs: number;
}

type Random = () => number;
const P = CLIENT_CONFIG.particles;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);
const pick = <T>(random: Random, items: readonly T[]) => items[Math.floor(random() * items.length)]!;

function particle(kind: ParticleKind, at: Point, angle: number, speed: number, rest: Partial<Particle> & Pick<Particle, "size" | "color" | "bornMs" | "lifeMs">): Particle {
  return { kind, x: at.x, y: at.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle: 0, spin: 0, flip: 0, flipSpeed: 0, ...rest };
}

/** A burst of fluttering paper shot upward from `origin`, fanning out to both sides. */
export function spawnConfetti(random: Random, origin: Point, colors: readonly string[], bornMs: number): Particle[] {
  return Array.from({ length: P.confettiCount }, () => {
    const angle = -Math.PI / 2 + between(random, -1.2, 1.2);
    return particle("confetti", origin, angle, between(random, 0.45, 1) * P.confettiSpeed, {
      size: between(random, 0.7, 1.3) * P.confettiSize,
      color: pick(random, colors),
      angle: between(random, 0, Math.PI * 2),
      spin: between(random, -8, 8),
      flip: between(random, 0, Math.PI * 2),
      flipSpeed: between(random, 6, 14),
      bornMs: bornMs + between(random, 0, 120),
      lifeMs: P.confettiLifeMs * between(random, 0.75, 1),
    });
  });
}

/** Sparks thrown off the head of the win line as it travels from `from` to `to`. */
export function spawnSparksAlong(random: Random, from: Point, to: Point, colors: readonly string[], startMs: number, durationMs: number): Particle[] {
  return Array.from({ length: P.sparkCount }, (_, i) => {
    const f = i / (P.sparkCount - 1);
    const at = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
    return particle("spark", at, between(random, 0, Math.PI * 2), between(random, 0.3, 1) * P.sparkSpeed, {
      size: between(random, 0.6, 1.2) * P.sparkSize,
      color: pick(random, colors),
      bornMs: startMs + f * durationMs,
      lifeMs: P.sparkLifeMs * between(random, 0.6, 1),
    });
  });
}

/** Stars bursting out in a ring from `origin` (where the result tag lands). */
export function spawnStars(random: Random, origin: Point, color: string, bornMs: number): Particle[] {
  return Array.from({ length: P.starCount }, (_, i) => {
    const angle = (i / P.starCount) * Math.PI * 2 + between(random, -0.2, 0.2);
    return particle("star", origin, angle, between(random, 0.6, 1) * P.starSpeed, {
      size: between(random, 0.7, 1.2) * P.starSize,
      color,
      spin: between(random, -6, 6),
      bornMs,
      lifeMs: P.starLifeMs,
    });
  });
}

/** One physics step of `dt` seconds. Sparks barely fall; confetti flutters down slowly; stars slow to a stop. */
export function stepParticle(p: Particle, dt: number): Particle {
  const gravity = p.kind === "confetti" ? P.gravity : p.kind === "spark" ? P.gravity * 0.15 : 0;
  const keep = Math.pow(p.kind === "confetti" ? P.drag : P.drag * 0.5, dt);
  const fluttering = p.kind === "confetti";
  const vx = p.vx * keep + (fluttering ? Math.sin(p.flip) * P.confettiSway * dt : 0);
  const falling = p.vy * keep + gravity * dt;
  const vy = fluttering ? Math.min(falling, P.confettiFallSpeed) : falling;
  return { ...p, x: p.x + vx * dt, y: p.y + vy * dt, vx, vy, angle: p.angle + p.spin * dt, flip: p.flip + p.flipSpeed * dt };
}
