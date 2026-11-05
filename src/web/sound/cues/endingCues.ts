import { durations } from "../../../theme";
import { CELEBRATION_TIMING } from "../../utils/celebrationTiming";
import { POINT_TICK_TAKES } from "../library/endingSounds";
import type { SoundName, SoundStep } from "../soundBook";

/**
 * Which sounds play when a match ends, and when: one list per way of seeing the ending (DESIGN.md, Match
 * screen). Times are the animation's own, so changing the motion tokens moves the sounds with it.
 */

export type EndingTone = "win" | "lose" | "draw" | "watch";

export interface EndingSoundOptions {
  /** The move that ended it, played as usual as its mark lands. Left out if someone quit: no last move. */
  lastMove: Pick<SoundStep, "sound" | "variant" | "volume"> | null;
  /** A win line is drawn (not when someone quit). */
  line: boolean;
}

/** The result of a match, timed from the moment it ended. */
export function matchEndingSteps(tone: EndingTone, { lastMove, line }: EndingSoundOptions): SoundStep[] {
  const { lineAt, celebrateAt } = CELEBRATION_TIMING;
  const steps: SoundStep[] = [];
  if (lastMove) steps.push({ ...lastMove, at: 0 });
  // The board's thump starts a slow beat later, as the mark lands. Its peak comes halfway through.
  steps.push({ sound: "boardThump", at: durations.slow + durations.fast / 2 });
  if (tone === "draw") {
    steps.push({ sound: "matchDrawShrug", at: durations.slow + durations.fast / 2 }, { sound: "boardShakeRattle", at: celebrateAt });
    return steps;
  }
  if (line) steps.push({ sound: tone === "win" ? "winLineDrawnWithSparks" : "winLineDrawn", at: lineAt, volume: tone === "win" ? 1 : 0.75 });
  if (tone === "win") steps.push({ sound: "matchWinFanfare", at: celebrateAt });
  else if (tone === "lose") steps.push({ sound: "matchLossSting", at: celebrateAt });
  else steps.push({ sound: "matchWatchedResult", at: celebrateAt });
  return steps;
}

/**
 * How long after the result tag lands its number starts counting: the result's own sound finishes first, so the ticks
 * never talk over it.
 */
export const POINTS_WAIT_MS: Record<EndingTone, number> = { win: 700, lose: 700, draw: durations.celebrate, watch: durations.celebrate };

/** Which take of `pointsTick` for a count at `value` of `total`: a step per point, or for long counts the whole climb. */
export function pointsTickTake(value: number, total: number): number {
  if (total <= POINT_TICK_TAKES) return value - 1;
  return Math.round(((value - 1) / (total - 1)) * (POINT_TICK_TAKES - 1));
}

/** The results' champion card and confetti: the fanfare starts as the card starts to pop in. */
export const CHAMPION_REVEAL_AT = durations.stagger * 2;

export function championSteps(championIds: readonly number[], myId: number): SoundStep[] {
  const fanfare: SoundName = !championIds.includes(myId) ? "championAnnounced" : championIds.length > 1 ? "championFanfareShared" : "championFanfare";
  return [{ sound: fanfare, at: CHAMPION_REVEAL_AT }];
}
