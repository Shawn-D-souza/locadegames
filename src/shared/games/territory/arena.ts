import { difference, FillRule, inflatePaths, EndType, JoinType } from "clipper2-ts";
import { TERRITORY_CONFIG } from "./config";
import type { Land, Point, Ring } from "./types";

/** The round arena: its size, its polygon, start positions and start land. */

export function arenaRadiusFor(players: number): number {
  return Math.round(TERRITORY_CONFIG.arenaBaseRadius + TERRITORY_CONFIG.arenaRadiusPerSqrtPlayer * Math.sqrt(players));
}

/** Farthest a head's center gets from the middle: its trail's outer edge then touches the wall. */
export function headLimit(radius: number): number {
  return radius - TERRITORY_CONFIG.trailWidth / 2;
}

export function circleRing(cx: number, cy: number, r: number, vertices: number): Ring {
  return Array.from({ length: vertices }, (_, i) => {
    const angle = (2 * Math.PI * i) / vertices;
    // `+ 0` turns -0 into 0, so rings compare and encode cleanly.
    return { x: Math.round(cx + r * Math.cos(angle)) + 0, y: Math.round(cy + r * Math.sin(angle)) + 0 };
  });
}

/** The arena as a polygon. Land is clipped to exactly this shape and the client draws exactly this shape. */
export function arenaPolygon(radius: number): Land {
  return [circleRing(0, 0, radius, TERRITORY_CONFIG.arenaVertices)];
}

/** A thin band just inside the wall: an open area touches the wall when it overlaps this band. */
export function wallBand(arena: Land): Land {
  const inner = inflatePaths(arena, -TERRITORY_CONFIG.wallBandWidth, JoinType.Miter, EndType.Polygon);
  return difference(arena, inner, FillRule.NonZero);
}

/** Start positions, evenly spaced on a ring; player `index` of `count`. */
export function spawnPoint(index: number, count: number, radius: number): Point {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const r = radius * TERRITORY_CONFIG.spawnRingRatio;
  return { x: Math.round(r * Math.cos(angle)), y: Math.round(r * Math.sin(angle)) };
}

export function startLand(center: Point): Land {
  return [circleRing(center.x, center.y, TERRITORY_CONFIG.startLandRadius, TERRITORY_CONFIG.startLandVertices)];
}
