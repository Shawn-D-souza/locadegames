import {
  ClipType,
  EndType,
  FillRule,
  JoinType,
  PolyTree64,
  booleanOpWithPolyTree,
  difference,
  inflatePaths,
  intersect,
  union,
  type PolyPath64,
} from "clipper2-ts";
import { TERRITORY_CONFIG } from "./config";
import { distanceToLandSq, landArea, landBounds } from "./geometry";
import type { Land, Point, Ring } from "./types";

/**
 * What a trail captures, as exact polygons: the trail itself (its full width, round joins like the
 * drawn trail) plus every open area it closed off, clipped to the arena. Nothing is smoothed or
 * snapped to a grid, so the new land is exactly the shape that was drawn.
 */

/** Clipper's output as plain points (it adds an unused `z` to every point). */
function plain(land: Land): Land {
  return land.map((ring) => ring.map(({ x, y }) => ({ x, y })));
}

export interface ArenaShape {
  /** The arena polygon. */
  arena: Land;
  /** Thin band just inside the wall (see `wallBand`). */
  band: Land;
  /** Farthest a head's center gets from the middle. */
  headLimit: number;
}

/**
 * The trail as an area: the drawn stroke (width = trail width, round joins and ends). Where it runs
 * along the wall, a skirt reaches past the wall, so no sliver of open ground is left between trail and wall.
 */
export function trailArea(trail: readonly Point[], headLimit: number): Land {
  const { trailWidth, arcTolerance, wallContactSlack } = TERRITORY_CONFIG;
  const path = trail.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  const stroke = inflatePaths([path], trailWidth / 2, JoinType.Round, EndType.Round, 2, arcTolerance);
  const onWall = (p: Point) => p.x * p.x + p.y * p.y >= (headLimit - wallContactSlack) ** 2;
  const beyond = (p: Point): Point => {
    const scale = (headLimit + trailWidth * 2) / Math.sqrt(p.x * p.x + p.y * p.y);
    return { x: Math.round(p.x * scale), y: Math.round(p.y * scale) };
  };
  const skirts: Ring[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if (onWall(a) && onWall(b)) skirts.push([a, b, beyond(b), beyond(a)]);
  }
  return skirts.length ? union(stroke, skirts, FillRule.NonZero) : stroke;
}

/** The separate pieces of a land: each outline with its holes (an island inside a hole is a piece of its own). */
export function landPieces(land: Land): Land[] {
  const tree = new PolyTree64();
  booleanOpWithPolyTree(ClipType.Union, land, [], tree, FillRule.NonZero);
  const pieces: Land[] = [];
  const visit = (node: PolyPath64) => {
    for (let i = 0; i < node.count; i++) {
      const child = node.child(i);
      if (!child.isHole && child.poly) {
        const piece: Land = [child.poly];
        for (let h = 0; h < child.count; h++) {
          const hole = child.child(h).poly;
          if (hole) piece.push(hole);
        }
        pieces.push(plain(piece));
      }
      visit(child);
    }
  };
  visit(tree);
  return pieces;
}

/** A piece thinner than `minLandThickness` everywhere (shrinking it by half that leaves nothing). */
function isSliver(piece: Land): boolean {
  const half = TERRITORY_CONFIG.minLandThickness / 2;
  return inflatePaths(piece, -half, JoinType.Round, EndType.Polygon, 2, TERRITORY_CONFIG.arcTolerance).length === 0;
}

/**
 * What is left of your land after someone else's capture took part of it. Slivers too thin to stand on
 * vanish (so taking all the land you can see always knocks you out). When a piece is cut in two (or more),
 * you keep one part and the rest vanishes: the part at `anchor` (where you stand, or where your trail left
 * home), else the part nearest to it; a piece you are not on keeps its biggest part. Pieces that were
 * already separate (land won by cutting someone) stay separate.
 */
export function keepConnected(before: Land, after: Land, anchor: Point): Land {
  const all = landPieces(after);
  const parts = all.filter((part) => !isSliver(part));
  if (parts.length === 0) return [];
  if (parts.length === 1 && all.length === 1) return after;
  const olds = landPieces(before);
  const groups = new Map<number, Land[]>();
  parts.forEach((part, index) => {
    // A part lies inside exactly one old piece; unmatched (never expected) parts stand alone.
    const old = olds.findIndex((o) => intersect(part, o, FillRule.NonZero).length > 0);
    const key = old >= 0 ? old : olds.length + index;
    groups.set(key, [...(groups.get(key) ?? []), part]);
  });
  const slackSq = TERRITORY_CONFIG.anchorSlack ** 2;
  const kept: Land = [];
  for (const [key, group] of groups) {
    const old = olds[key];
    const anchored = !!old && distanceToLandSq(old, anchor) <= slackSq;
    const score = (part: Land) => (anchored ? distanceToLandSq(part, anchor) : -landArea(part));
    let best = group[0]!;
    for (const part of group) if (score(part) < score(best)) best = part;
    kept.push(...best);
  }
  return kept;
}

/** One open area: its outline and the islands inside it. */
interface OpenArea {
  outer: Ring;
  area: number;
  touchesWall: boolean;
}

/** Every open area of the arena outside `land` (nested ones too: areas inside islands inside holes). */
function openAreas(land: Land, shape: ArenaShape): OpenArea[] {
  const tree = new PolyTree64();
  booleanOpWithPolyTree(ClipType.Difference, shape.arena, land, tree, FillRule.NonZero);
  const areas: OpenArea[] = [];
  const visit = (node: PolyPath64) => {
    for (let i = 0; i < node.count; i++) {
      const child = node.child(i);
      if (!child.isHole && child.poly) {
        const holes: Ring[] = [];
        for (let h = 0; h < child.count; h++) {
          const hole = child.child(h).poly;
          if (hole) holes.push(hole);
        }
        const outer = child.poly;
        const region: Land = [outer, ...holes];
        areas.push({
          outer,
          area: landArea(region),
          touchesWall: intersect(region, shape.band, FillRule.NonZero).length > 0,
        });
      }
      visit(child);
    }
  };
  visit(tree);
  return areas;
}

/** Same open area as before the capture: same area (exact for integer polygons) and same bounds. */
function sameArea(a: OpenArea, b: OpenArea): boolean {
  if (a.area !== b.area) return false;
  const ba = landBounds([a.outer]);
  const bb = landBounds([b.outer]);
  return !!ba && !!bb && ba.minX === bb.minX && ba.minY === bb.minY && ba.maxX === bb.maxX && ba.maxY === bb.maxY;
}

/**
 * Land after coming home along `trail` (from the exit point on the land's edge to the entry point).
 * Fills every open area the trail newly closed off. Areas cut off against the wall count too, except
 * the biggest one: that is the rest of the arena.
 */
export function captureLand(land: Land, trail: readonly Point[], shape: ArenaShape): Land {
  const before = openAreas(land, shape);
  const grown = intersect(union(land, trailArea(trail, shape.headLimit), FillRule.NonZero), shape.arena, FillRule.NonZero);
  const after = openAreas(grown, shape).filter((open) => !before.some((old) => sameArea(old, open)));
  const atWall = after.filter((open) => open.touchesWall);
  const rest = atWall.reduce<OpenArea | null>((big, open) => (!big || open.area > big.area ? open : big), null);
  const enclosed = after.filter((open) => open !== rest).map((open) => open.outer);
  return plain(enclosed.length ? union(grown, enclosed, FillRule.NonZero) : grown);
}

/** `land` without whatever `taken` covers. */
export function subtractLand(land: Land, taken: Land): Land {
  return plain(difference(land, taken, FillRule.NonZero));
}

export function mergeLand(a: Land, b: Land): Land {
  return plain(union(a, b, FillRule.NonZero));
}
