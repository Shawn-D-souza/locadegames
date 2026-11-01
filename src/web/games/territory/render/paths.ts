import type { Land, Point } from "../../../../shared/games/territory/types";

/**
 * Path2D objects for land, built once per land (lands are replaced, never changed in place),
 * so a frame only fills ready-made paths.
 */

const landPaths = new WeakMap<Land, Path2D>();
const outsidePaths = new WeakMap<Land, Path2D>();

export function landPath(land: Land): Path2D {
  let path = landPaths.get(land);
  if (!path) {
    path = new Path2D();
    for (const ring of land) {
      if (!ring.length) continue;
      path.moveTo(ring[0]!.x, ring[0]!.y);
      for (let i = 1; i < ring.length; i++) path.lineTo(ring[i]!.x, ring[i]!.y);
      path.closePath();
    }
    landPaths.set(land, path);
  }
  return path;
}

/** Everything except the land (a huge square with the land cut out, even-odd): trails are clipped to it. */
export function outsidePath(land: Land, extent: number): Path2D {
  let path = outsidePaths.get(land);
  if (!path) {
    path = new Path2D();
    path.rect(-extent, -extent, extent * 2, extent * 2);
    path.addPath(landPath(land));
    outsidePaths.set(land, path);
  }
  return path;
}

export function polylinePath(points: readonly Point[]): Path2D {
  const path = new Path2D();
  if (!points.length) return path;
  path.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i]!.x, points[i]!.y);
  // A single point still draws as a round dot.
  if (points.length === 1) path.lineTo(points[0]!.x, points[0]!.y);
  return path;
}
