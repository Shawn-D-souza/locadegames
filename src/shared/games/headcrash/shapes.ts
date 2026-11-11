import { HEADCRASH_CONFIG } from "./config";
import type { Point } from "./types";

/**
 * Tools for drawing Head Crash's maps by hand: an outline is a few corners, each rounded off by its own radius,
 * plus smooth floors from simple curves. Pure geometry.
 */

const SEGMENT = HEADCRASH_CONFIG.arena.segment;

/** A corner of an outline, rounded off with radius `r` (0: sharp). */
export interface Corner {
  x: number;
  y: number;
  r: number;
}

export const corner = (x: number, y: number, r = 0): Corner => ({ x, y, r });

/**
 * A whole outline that is the same on both sides, from its right half: corners from a point on the middle line
 * (x = 0) round the right side and back to the middle line. The left half is its mirror image.
 */
export function mirrored(half: readonly Corner[]): Corner[] {
  const inner = half.slice(1, -1);
  return [...half, ...inner.reverse().map((c) => ({ ...c, x: -c.x }))];
}

/** The same outline on the other side (x → -x), walked the same way round. */
export const flipped = (outline: readonly Corner[]): Corner[] => outline.map((c) => ({ ...c, x: -c.x })).reverse();

/** Points of a floor `y = f(x)` from `fromX` to `toX` (both included), as sharp corners: the curve is smooth by itself. */
export function curve(fromX: number, toX: number, f: (x: number) => number): Corner[] {
  const steps = Math.max(1, Math.ceil(Math.abs(toX - fromX) / SEGMENT));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = fromX + ((toX - fromX) * i) / steps;
    return corner(x, f(x));
  });
}

/** A smooth hump `height` high (a dip if negative) from `center - half` to `center + half`; 0 elsewhere. */
export function hump(x: number, center: number, half: number, height: number): number {
  const offset = Math.abs(x - center);
  return offset >= half ? 0 : (height * (1 + Math.cos((Math.PI * offset) / half))) / 2;
}

/** From `y0` at `x0` to `y1` at `x1`, easing in and out (flat at both ends). */
export function ease(x: number, x0: number, y0: number, x1: number, y1: number): number {
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return y0 + ((y1 - y0) * (1 - Math.cos(Math.PI * t))) / 2;
}

/** Twice the signed area: positive when the outline runs counter-clockwise. */
export function signedArea(points: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return area;
}

/**
 * The outline's points, each corner rounded off by an arc of its radius (smaller if its sides are too short),
 * sampled no coarser than the wall's segment. Points on top of the one before are dropped.
 */
export function rounded(corners: readonly Corner[]): Point[] {
  const points: Point[] = [];
  const push = (x: number, y: number) => {
    const last = points[points.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 1e-6) points.push({ x, y });
  };
  const count = corners.length;
  corners.forEach((b, i) => {
    const a = corners[(i + count - 1) % count]!;
    const c = corners[(i + 1) % count]!;
    const toA = Math.hypot(a.x - b.x, a.y - b.y);
    const toC = Math.hypot(c.x - b.x, c.y - b.y);
    if (b.r <= 0 || toA < 1e-9 || toC < 1e-9) return push(b.x, b.y);
    const ux = (a.x - b.x) / toA;
    const uy = (a.y - b.y) / toA;
    const vx = (c.x - b.x) / toC;
    const vy = (c.y - b.y) / toC;
    const angle = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    if (angle > Math.PI - 1e-6) return push(b.x, b.y);
    // How far along each side the arc starts: no more than half of either side, so neighbours never overlap.
    const reach = Math.min(b.r / Math.tan(angle / 2), toA / 2, toC / 2);
    const radius = reach * Math.tan(angle / 2);
    const bx = ux + vx;
    const by = uy + vy;
    const bisector = Math.hypot(bx, by);
    const cx = b.x + (bx / bisector) * (radius / Math.sin(angle / 2));
    const cy = b.y + (by / bisector) * (radius / Math.sin(angle / 2));
    const from = Math.atan2(b.y + uy * reach - cy, b.x + ux * reach - cx);
    let sweep = Math.atan2(b.y + vy * reach - cy, b.x + vx * reach - cx) - from;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    const steps = Math.max(2, Math.ceil((radius * Math.abs(sweep)) / SEGMENT));
    for (let k = 0; k <= steps; k++) {
      const t = from + (sweep * k) / steps;
      push(cx + radius * Math.cos(t), cy + radius * Math.sin(t));
    }
  });
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (points.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) <= 1e-6) points.pop();
  return points;
}
