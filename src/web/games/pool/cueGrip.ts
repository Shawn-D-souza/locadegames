import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { POOL_LOOK } from "./look";

/** A point on the table, in table units. */
export interface TablePoint {
  x: number;
  y: number;
}

/** Which way the shot goes: a unit vector. */
export interface Aim {
  dx: number;
  dy: number;
}

/**
 * Whether a touch at `point` takes hold of the cue (to pull it back) rather than aiming: on the cue ball, or close to
 * the stick lying behind it along `aim`.
 */
export function onCue(cueBall: TablePoint, aim: Aim, point: TablePoint): boolean {
  const x = point.x - cueBall.x;
  const y = point.y - cueBall.y;
  if (x * x + y * y <= POOL_LOOK.gripBall * POOL_LOOK.gripBall) return true;
  // Behind the ball along the stick, and how far to either side of it.
  const behind = -(x * aim.dx + y * aim.dy);
  const aside = Math.abs(x * aim.dy - y * aim.dx);
  return behind > 0 && behind <= POOL_CONFIG.ballRadius + POOL_LOOK.cueGap + POOL_LOOK.cueLength && aside <= POOL_LOOK.grip;
}

/**
 * The aim turned as a finger sweeps from `from` to `to` round the cue ball (owner direction: turn the cue from anywhere,
 * so a ball in a corner can still be aimed out of it): by the angle the finger turned through round the ball. With the
 * finger on the stick it follows the finger; anywhere else it turns the same way round. Null when either point is
 * right next to the ball (too fiddly to tell an angle there).
 */
export function turnBy(aim: Aim, cueBall: TablePoint, from: TablePoint, to: TablePoint): Aim | null {
  const ax = from.x - cueBall.x;
  const ay = from.y - cueBall.y;
  const bx = to.x - cueBall.x;
  const by = to.y - cueBall.y;
  const a = Math.sqrt(ax * ax + ay * ay);
  const b = Math.sqrt(bx * bx + by * by);
  if (a < POOL_LOOK.aimDeadZone || b < POOL_LOOK.aimDeadZone) return null;
  // The turn from one to the other, as a cosine and a sine.
  const cos = (ax * bx + ay * by) / (a * b);
  const sin = (ax * by - ay * bx) / (a * b);
  const dx = aim.dx * cos - aim.dy * sin;
  const dy = aim.dx * sin + aim.dy * cos;
  const length = Math.sqrt(dx * dx + dy * dy);
  return { dx: dx / length, dy: dy / length };
}

/** How far the cue is drawn back (0 … 1 of a full pull) with the finger moved from `from` to `to`: only moving back along the stick counts (owner direction: never forward). */
export function pullOf(aim: Aim, from: TablePoint, to: TablePoint): number {
  const back = -((to.x - from.x) * aim.dx + (to.y - from.y) * aim.dy);
  return Math.min(1, Math.max(0, back / POOL_LOOK.fullPull));
}

/** A finger holding the cue moved from `from` to `to`: whether it's pulling back along the stick (anything else, sideways or forward, turns it). */
export function pullingBack(aim: Aim, from: TablePoint, to: TablePoint): boolean {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const back = -(x * aim.dx + y * aim.dy);
  return back > 0 && back >= Math.abs(x * aim.dy - y * aim.dx);
}

/** How far a finger holding the cue has moved (table units). */
export const moved = (from: TablePoint, to: TablePoint) => Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
