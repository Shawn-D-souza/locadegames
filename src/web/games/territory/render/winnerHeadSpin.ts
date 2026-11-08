import { TERRITORY_CLIENT_CONFIG } from "../config";

/**
 * How the ending's big winner head turns (owner decision 2026-11-08): from the way it was heading when
 * the match ended, it spins as it drops, full turns plus the short way round, and stops facing us.
 * Pure (no canvas), so it is tested on its own.
 */

const LOOK = TERRITORY_CLIENT_CONFIG.look;
/** Facing us: heading down the screen, eyes to the camera. */
const FACING_US = Math.PI / 2;
const TURN = 2 * Math.PI;

/** Fast at first, slowing to a stop (a spin that settles). */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * The head's angle `sinceMs` after the ending started: its own heading (`angle`) until it drops, then
 * spinning the way the short turn to face us goes, and facing us once the spin is over.
 */
export function winnerHeadAngle(angle: number, sinceMs: number): number {
  const t = easeOutCubic(Math.min(1, Math.max(0, (sinceMs - LOOK.winnerHeadAtMs) / LOOK.winnerHeadSpinMs)));
  // The short way round to face us, in (-π, π]; facing us already, it still spins (clockwise).
  let short = (FACING_US - angle) % TURN;
  if (short > Math.PI) short -= TURN;
  if (short <= -Math.PI) short += TURN;
  const turn = short + Math.sign(short || 1) * LOOK.winnerHeadSpins * TURN;
  return angle + turn * t;
}
