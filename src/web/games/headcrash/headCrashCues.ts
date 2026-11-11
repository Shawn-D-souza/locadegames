import type { Seat } from "../../../shared/games/types";
import type { EndingTone } from "../../sound/cues/endingCues";
import type { SoundName, SoundStep } from "../../sound/soundBook";
import { HEADCRASH_CLIENT_CONFIG } from "./config";

/** Which sound goes with what in a Head Crash match: pure decisions, so they can be tested. */

const { sound: SOUND, hud: HUD } = HEADCRASH_CLIENT_CONFIG;

/** The sound of a head being hit, for whoever is looking: your point, your head, both heads, or a match you watch. */
export function hitSound(scorer: Seat | null, mySeat: Seat | null): SoundName {
  if (mySeat === null) return "headCrashWatchedHit";
  if (scorer === null) return "headCrashBothHeadsHit";
  return scorer === mySeat ? "headCrashYouScored" : "headCrashYouWereHit";
}

/** Which landing take a landing this hard gets, and how loud; null when it is too soft (or too short a hop) to hear. */
export function landingTake(impact: number, airTicks: number): { variant: number; volume: number } | null {
  if (impact < SOUND.minImpact || airTicks < SOUND.minAirTicks) return null;
  const strength = Math.min(1, (impact - SOUND.minImpact) / (SOUND.hardImpact - SOUND.minImpact));
  return { variant: strength >= 0.6 ? 1 : 0, volume: 0.55 + 0.45 * strength };
}

/** How loud a knock between the cars is; 0 when it is only a nudge. */
export function bumpVolume(impact: number): number {
  if (impact < SOUND.minImpact) return 0;
  return 0.5 + 0.5 * Math.min(1, (impact - SOUND.minImpact) / (SOUND.hardImpact - SOUND.minImpact));
}

/** The result of the match, as the tag stamps on (the last hit has had its own sound by then). */
export function headCrashEndingSteps(tone: EndingTone): SoundStep[] {
  const sound: SoundName = tone === "win" ? "matchWinFanfare" : tone === "lose" ? "matchLossSting" : tone === "draw" ? "matchDrawShrug" : "matchWatchedResult";
  return [{ sound, at: HUD.endTagAtMs }];
}
