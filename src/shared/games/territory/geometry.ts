import type { Land, Point, Ring } from "./types";

/** Plain geometry on integer points. Pure; no allocation in the hot loops beyond results. */

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function landBounds(land: Land): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of land) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

export function boundsOverlap(a: Bounds, b: Bounds, margin = 0): boolean {
  return a.minX - margin <= b.maxX && b.minX - margin <= a.maxX && a.minY - margin <= b.maxY && b.minY - margin <= a.maxY;
}

/** Twice the signed area of a ring (shoelace). Exact for integer points under 2^26. */
function doubleArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j]!.x * ring[i]!.y - ring[i]!.x * ring[j]!.y;
  }
  return sum;
}

/** Area of a ring regardless of winding. */
export function ringArea(ring: Ring): number {
  return Math.abs(doubleArea(ring)) / 2;
}

/** Area of a land: outer rings minus their holes (holes wind the other way). */
export function landArea(land: Land): number {
  return Math.abs(land.reduce((sum, ring) => sum + doubleArea(ring), 0)) / 2;
}

/** Even-odd test over every ring, so holes count as outside. Points exactly on an edge may go either way. */
export function pointInLand(land: Land, p: Point): boolean {
  let inside = false;
  for (const ring of land) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!;
      const b = ring[j]!;
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
  }
  return inside;
}

/** Squared distance from p to the land: 0 inside it, else to its nearest edge. */
export function distanceToLandSq(land: Land, p: Point): number {
  if (pointInLand(land, p)) return 0;
  let best = Infinity;
  for (const ring of land) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) best = Math.min(best, pointSegmentDistanceSq(p, ring[j]!, ring[i]!));
  }
  return best;
}

/** Whether p is in the land or within `reach` of its edge. */
export function nearLand(land: Land, p: Point, reach: number): boolean {
  if (pointInLand(land, p)) return true;
  const reachSq = reach * reach;
  for (const ring of land) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if (pointSegmentDistanceSq(p, ring[j]!, ring[i]!) <= reachSq) return true;
  }
  return false;
}

/** The point on the land's edge closest to p, rounded to whole units; null for no land. */
export function nearestEdgePoint(land: Land, p: Point): Point | null {
  let best: Point | null = null;
  let bestSq = Infinity;
  for (const ring of land) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j]!;
      const b = ring[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSq = dx * dx + dy * dy;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
      const x = a.x + dx * t;
      const y = a.y + dy * t;
      const dSq = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (dSq < bestSq) {
        bestSq = dSq;
        best = { x: Math.round(x), y: Math.round(y) };
      }
    }
  }
  return best;
}

/**
 * Where the segment a→b first crosses the land's edge (closest to a), rounded to whole units;
 * null if it doesn't cross. Used to start and end trails exactly on the edge.
 */
export function firstEdgeCrossing(land: Land, a: Point, b: Point): Point | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let best = Infinity;
  for (const ring of land) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const c = ring[j]!;
      const d = ring[i]!;
      const ex = d.x - c.x;
      const ey = d.y - c.y;
      const denom = dx * ey - dy * ex;
      if (denom === 0) continue;
      const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / denom;
      const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < best) best = t;
    }
  }
  return best === Infinity ? null : { x: Math.round(a.x + dx * best), y: Math.round(a.y + dy * best) };
}

export function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Squared distance from p to the segment a→b. */
export function pointSegmentDistanceSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distanceSq(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const x = a.x + dx * t - p.x;
  const y = a.y + dy * t - p.y;
  return x * x + y * y;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Squared distance between segments a→b and c→d (0 when they cross). */
export function segmentDistanceSq(a: Point, b: Point, c: Point, d: Point): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistanceSq(a, c, d),
    pointSegmentDistanceSq(b, c, d),
    pointSegmentDistanceSq(c, a, b),
    pointSegmentDistanceSq(d, a, b),
  );
}

/** The polyline without its last `length` units (the stretch under its owner's head). */
export function trimPolylineEnd(points: readonly Point[], length: number): Point[] {
  let remaining = length;
  for (let i = points.length - 1; i > 0; i--) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = Math.sqrt(distanceSq(a, b));
    if (segment >= remaining) {
      const keep = (segment - remaining) / segment;
      return [...points.slice(0, i), { x: a.x + (b.x - a.x) * keep, y: a.y + (b.y - a.y) * keep }];
    }
    remaining -= segment;
  }
  return [];
}

/** The polyline from its start to its closest point to `p` (the first such point on a tie). */
export function polylineUpTo(points: readonly Point[], p: Point): Point[] {
  if (points.length < 2) return [...points];
  let at = 1;
  let atT = 0;
  let bestSq = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
    const distSq = distanceSq(p, { x: a.x + dx * t, y: a.y + dy * t });
    if (distSq < bestSq) {
      bestSq = distSq;
      at = i;
      atT = t;
    }
  }
  const a = points[at - 1]!;
  const b = points[at]!;
  return [...points.slice(0, at), { x: a.x + (b.x - a.x) * atT, y: a.y + (b.y - a.y) * atT }];
}
