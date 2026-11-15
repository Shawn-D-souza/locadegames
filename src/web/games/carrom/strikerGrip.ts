import { alongBaseline, sideFrame, strikerFits, type Point } from "../../../shared/games/carrom/board";
import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import type { CarromCoin, CarromSide } from "../../../shared/games/carrom/types";
import { CARROM_LOOK } from "./look";

/** Which way the shot goes: a unit vector on the board. */
export interface Aim {
  dx: number;
  dy: number;
}

/** A pull back from the striker: the way the shot would go and how hard (0 … 1). */
export interface Sling {
  aim: Aim;
  power: number;
}

/** What a finger holding the striker does once it has moved: pulls it back like a sling (to shoot), or slides it along the baseline. */
export type HoldIntent = "pull" | "slide";

const { forwardMin, baseline } = CARROM_CONFIG;
/** The sideways share of an aim at the edge of what's allowed. */
const SIDEWAYS_MAX = Math.sqrt(1 - forwardMin * forwardMin);

/** Whether a touch at `point` takes hold of the striker standing at `striker`. */
export function onStriker(striker: Point, point: Point): boolean {
  return (point.x - striker.x) ** 2 + (point.y - striker.y) ** 2 <= CARROM_LOOK.grip * CARROM_LOOK.grip;
}

/** `aim` kept forward (owner decision: never back at coins behind you): an aim past the edge stops at the edge, on its own side. */
export function forwardAim(aim: Aim, side: CarromSide): Aim {
  const { forward, right } = sideFrame(side);
  const ahead = aim.dx * forward.x + aim.dy * forward.y;
  if (ahead >= forwardMin) return aim;
  const across = aim.dx * right.x + aim.dy * right.y >= 0 ? SIDEWAYS_MAX : -SIDEWAYS_MAX;
  return { dx: forward.x * forwardMin + right.x * across, dy: forward.y * forwardMin + right.y * across };
}

/**
 * The flick as the finger pulls back from `from` to `to` (owner direction: like flicking a real striker, any way you
 * like): the shot goes the opposite way to the pull (kept forward), as hard as the pull is long (a full pull, or more,
 * is full power). Null while the finger is still right where it took hold.
 */
export function slingOf(side: CarromSide, from: Point, to: Point): Sling | null {
  const x = from.x - to.x;
  const y = from.y - to.y;
  const length = Math.sqrt(x * x + y * y);
  if (length < CARROM_LOOK.gripDecide) return null;
  return { aim: forwardAim({ dx: x / length, dy: y / length }, side), power: Math.min(1, length / CARROM_LOOK.fullPull) };
}

/**
 * A finger holding the striker moved from `from` to `to`: close along the baseline slides it (only when held by the
 * striker itself, not by a long press); anything else pulls it back like a sling.
 */
export function holdIntent(side: CarromSide, from: Point, to: Point, canSlide: boolean): HoldIntent {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const { forward, right } = sideFrame(side);
  const along = Math.abs(x * right.x + y * right.y);
  const across = Math.abs(x * forward.x + y * forward.y);
  return canSlide && along > CARROM_LOOK.slideBias * across ? "slide" : "pull";
}

/**
 * Where the striker goes when slid toward `point`: there on the baseline (no further than its ends), or if a coin is in
 * the way, the nearest place it fits, searched outward in small steps; null if nowhere fits.
 */
export function slideTo(coins: readonly CarromCoin[], side: CarromSide, point: Point): number | null {
  const wanted = Math.max(-baseline.half, Math.min(baseline.half, alongBaseline(side, point)));
  return nearestFit(coins, side, wanted);
}

/** The nearest place to `at` on `side`'s baseline where the striker fits, or null. */
export function nearestFit(coins: readonly CarromCoin[], side: CarromSide, at: number): number | null {
  const step = 0.25;
  for (let d = 0; d <= 2 * baseline.half; d += step) {
    for (const candidate of d === 0 ? [at] : [at - d, at + d]) {
      if (strikerFits(coins, side, candidate)) return candidate;
    }
  }
  return null;
}

/** How far a finger holding the striker has moved (board units). */
export const moved = (from: Point, to: Point) => Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
