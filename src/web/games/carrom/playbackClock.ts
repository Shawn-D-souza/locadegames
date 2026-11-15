import { CARROM_LOOK } from "./look";

/**
 * How far into a shot the screen is, for a shot that reached this phone `lag` ms after it was flicked (0: your own,
 * played the moment you let go). Pure.
 *
 * Someone else's shot starts from the beginning the moment it arrives and plays `catchUp` times faster until it's level
 * with the shooter's, then at normal speed: so two phones side by side end together, and nothing jumps (owner
 * direction: your own shot is instant, and everyone still sees the same shot). Too far behind (a phone waking up), it
 * jumps straight to where everyone is.
 */

const { catchUp, catchUpMaxMs } = CARROM_LOOK;

/** How far into the shot (ms) the screen shows, `elapsed` ms after it started on this phone. */
export function shownMs(elapsed: number, lag: number): number {
  if (lag > catchUpMaxMs) return elapsed + lag;
  return Math.min(elapsed * catchUp, elapsed + lag);
}

/** When (ms after it started on this phone) the screen reaches `ms` into the shot; negative if already past when it arrived. */
export function localMs(ms: number, lag: number): number {
  if (lag > catchUpMaxMs) return ms - lag;
  // Level with the shooter once elapsed * catchUp = elapsed + lag.
  const level = lag / (catchUp - 1);
  return ms <= level * catchUp ? ms / catchUp : ms - lag;
}
