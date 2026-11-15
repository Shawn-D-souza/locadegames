import { POCKETS, type Point } from "../../../shared/games/carrom/board";
import type { CarromCoin } from "../../../shared/games/carrom/types";
import type { DrawDisc } from "./drawBoard";
import { CARROM_LOOK } from "./look";
import { discsAt } from "./shotFrames";
import type { ShotPlayback } from "./useShotPlayback";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A coin popping back onto the board: grows past its size a little, then settles (an ease-out-back). */
const popScale = (t: number) => {
  const c = CARROM_LOOK.popOvershoot;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

const resting = (coins: readonly CarromCoin[]): DrawDisc[] => coins.flatMap((c) => (c.on ? [{ x: c.x, y: c.y, scale: 1, kind: c.kind }] : []));

/**
 * The discs as they are drawn now: the coins lying still between shots (with your striker on your baseline while it's
 * your shot, in `striker`); during a shot, where it has taken them, the striker in its shooter's color, each disc that
 * drops sinking into its hole; then, as it settles, the coins as the rules left them (any put back popping on) while
 * the striker leaves the board.
 */
export function sceneDiscs(coins: readonly CarromCoin[], playback: ShotPlayback | null, striker: Point | null, settleMs: number): DrawDisc[] {
  if (!playback) return [...resting(coins), ...(striker ? [{ ...striker, scale: 1, kind: "striker" as const }] : [])];
  const { shot, frames, ms } = playback;
  const kindOf = (disc: number) => (disc === 0 ? ("striker" as const) : shot.before[disc - 1]!.kind);
  if (ms < frames.slideMs) {
    const at = discsAt(frames, ms);
    const sinking = frames.drops.flatMap((drop) => {
      const p = (ms - drop.ms) / CARROM_LOOK.dropMs;
      if (p < 0 || p >= 1) return [];
      const hole = POCKETS[drop.pocket]!;
      return [{ x: lerp(drop.x, hole.x, p), y: lerp(drop.y, hole.y, p), scale: 1 - CARROM_LOOK.dropShrink * p, kind: kindOf(drop.disc) }];
    });
    const sliding = at.on.flatMap((on, d) => (on ? [{ x: at.x[d]!, y: at.y[d]!, scale: 1, kind: kindOf(d) }] : []));
    return [...sinking, ...sliding];
  }
  const p = Math.min(1, (ms - frames.slideMs) / settleMs);
  const end = frames.on.at(-1)!;
  const settled = coins.flatMap((c, i) => {
    const wasOn = end[i + 1] === 1;
    if (c.on) return [{ x: c.x, y: c.y, scale: wasOn ? 1 : popScale(p), kind: c.kind }];
    return [];
  });
  // The striker, if it stayed on the board, shrinks away.
  const strikerLeaving = end[0] === 1 && p < 1 ? [{ x: frames.x.at(-1)![0]!, y: frames.y.at(-1)![0]!, scale: 1 - p, kind: "striker" as const }] : [];
  return [...settled, ...strikerLeaving];
}
