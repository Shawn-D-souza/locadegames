import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { POCKETS } from "../../../shared/games/pool/table";
import type { BallOwner, PoolBall, PoolShot } from "../../../shared/games/pool/types";
import type { DrawBall, DrawCue } from "./drawTable";
import { POOL_LOOK } from "./look";
import { ballsAt } from "./shotFrames";
import type { ShotPlayback } from "./useShotPlayback";

/** A ball's color, and whether it's yours (a white dot). */
export type BallPaint = (owner: BallOwner) => { color: string; mine: boolean };


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A ball popping back onto the table: grows past its size a little, then settles (an ease-out-back). */
const popScale = (t: number) => {
  const c = POOL_LOOK.popOvershoot;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

const resting = (balls: readonly PoolBall[], paint: BallPaint): DrawBall[] =>
  balls.flatMap((b) => (b.on ? [{ x: b.x, y: b.y, scale: 1, ...paint(b.owner) }] : []));

/**
 * The balls as they are drawn now: standing still between shots; during a shot, where the shot has taken them (each
 * ball that drops sinking into its pocket); then, as it settles, the table as the rules left it (a scratched cue ball
 * or a black put back popping on, an out player's balls shrinking away).
 */
export function sceneBalls(balls: readonly PoolBall[], playback: ShotPlayback | null, paint: BallPaint): DrawBall[] {
  if (!playback) return resting(balls, paint);
  const { shot, frames, ms } = playback;
  const t = ms - POOL_CONFIG.leadMs;
  if (t < 0) return resting(shot.before, paint);
  if (t < frames.rollMs) {
    const at = ballsAt(frames, t);
    const sinking = frames.drops.flatMap((drop) => {
      const p = (t - drop.ms) / POOL_LOOK.dropMs;
      if (p < 0 || p >= 1) return [];
      const pocket = POCKETS[drop.pocket]!;
      return [{ x: lerp(drop.x, pocket.x, p), y: lerp(drop.y, pocket.y, p), scale: 1 - POOL_LOOK.dropShrink * p, ...paint(shot.before[drop.ball]!.owner) }];
    });
    const rolling = shot.before.flatMap((b, i) => (at.on[i] ? [{ x: at.x[i]!, y: at.y[i]!, scale: 1, ...paint(b.owner) }] : []));
    return [...sinking, ...rolling];
  }
  const p = Math.min(1, (t - frames.rollMs) / POOL_CONFIG.settleMs);
  const end = frames.on.at(-1)!;
  return balls.flatMap((b, i) => {
    const wasOn = end[i] === 1;
    if (b.on) return [{ x: b.x, y: b.y, scale: wasOn ? 1 : popScale(p), ...paint(b.owner) }];
    if (!wasOn) return [];
    return [{ x: frames.x.at(-1)![i]!, y: frames.y.at(-1)![i]!, scale: 1 - p, ...paint(b.owner) }];
  });
}

/** The cue lined up on a shot about to be struck: held drawn back, then rushing in to meet the cue ball as the lead ends. */
export function strikingCue(playback: ShotPlayback, color: string): DrawCue | null {
  const { shot, ms } = playback;
  const { leadMs } = POOL_CONFIG;
  if (ms >= leadMs) return null;
  const strikeFrom = leadMs * (1 - POOL_LOOK.strikeShare);
  const p = ms < strikeFrom ? 0 : (ms - strikeFrom) / (leadMs - strikeFrom);
  return aimedCue(shot.before[0]!, shot.shot, shot.shot.power * (1 - p * p), color);
}

/** The cue behind the cue ball pointing along `shot`, drawn back by `power` (0 … 1 of a full pull), plus `twitch` (table units: a long press's nudge). */
export function aimedCue(cueBall: { x: number; y: number }, shot: Pick<PoolShot, "dx" | "dy">, power: number, color: string, twitch = 0): DrawCue {
  return { x: cueBall.x, y: cueBall.y, dx: shot.dx, dy: shot.dy, pull: power * POOL_LOOK.fullPull + twitch, color };
}
