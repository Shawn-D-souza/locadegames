import { TERRITORY_CONFIG } from "./config";
import { firstEdgeCrossing, nearLand, nearestEdgePoint, pointInLand } from "./geometry";
import type { Land, Point } from "./types";

/**
 * Leaving and coming home, shared by the server's step and your phone's prediction so both agree exactly.
 * A head is home in its land or with its center within `homeReach` of it; a trail starts and ends on the
 * land's edge, one point each (all the phones are told).
 */

export function isHome(land: Land, head: Point): boolean {
  return nearLand(land, head, TERRITORY_CONFIG.homeReach);
}

/**
 * Where a trail starts as the head leaves home, moving `from` → `head`: where it crossed the land's edge,
 * or (already just outside it) the edge point nearest where it was; with no land left under it, where it was.
 */
export function trailExit(land: Land, from: Point, head: Point): Point {
  const crossing = firstEdgeCrossing(land, from, head);
  if (crossing) return crossing;
  return (isHome(land, from) ? nearestEdgePoint(land, from) : null) ?? { x: from.x, y: from.y };
}

/** Where a trail ending at `last` ends as the head comes home: where it crossed the land's edge, or the edge point nearest the head. */
export function trailEntry(land: Land, last: Point, head: Point): Point {
  const crossing = firstEdgeCrossing(land, last, head);
  if (crossing) return crossing;
  if (pointInLand(land, head)) return { x: head.x, y: head.y };
  return nearestEdgePoint(land, head) ?? { x: head.x, y: head.y };
}
