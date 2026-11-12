import { DOTSCLASH_HAPTICS } from "../games/dotsclash/haptics";
import { HEADCRASH_HAPTICS } from "../games/headcrash/haptics";
import { TERRITORY_HAPTICS } from "../games/territory/haptics";
import { TICTACTOE_HAPTICS } from "../games/tictactoe/haptics";
import { ULTIMATE_HAPTICS } from "../games/ultimate/haptics";
import { defineHaptics, pulseEnd, type HapticStep, type Pulse } from "./definition";

/** The platform's feels. Short where frequent, patterns only for moments that matter (DESIGN.md, Haptics). */
const PLATFORM_HAPTICS = defineHaptics({
  smallPress: { about: "A small control: an icon button, a switch, a game tile, a match card, a step of the volume.", pulses: [{ at: 0, level: "selection" }] },
  buttonPress: { about: "A big button with a lip.", pulses: [{ at: 0, level: "light" }] },
  smallNews: { about: "Something small and good: a friend arrived, the code is complete, you became host.", pulses: [{ at: 0, level: "light" }] },
  clockTick: { about: "One of the last seconds on a clock.", pulses: [{ at: 0, level: "selection" }] },
  countdownTick: { about: "3, 2, 1.", pulses: [{ at: 0, level: "light" }] },
  gameStarting: { about: "The host started a game: look at your phone.", pulses: [{ at: 0, level: "medium" }] },
  go: { about: "GO: play starts now.", pulses: [{ at: 0, level: "heavy" }] },
  refused: { about: "That didn't work: two quick taps, a small no.", pulses: [{ at: 0, level: "light" }, { at: 80, level: "light" }] },
  warning: { about: "A serious question, or the connection dropped.", pulses: [{ at: 0, level: "medium" }, { at: 110, level: "medium" }] },
  failure: { about: "A screen that stops you: something went wrong, or the servers are full.", pulses: [{ at: 0, level: "medium" }, { at: 90, level: "medium" }, { at: 180, level: "heavy" }] },
  thump: { about: "Something heavy lands: the board or the arena as a match ends.", pulses: [{ at: 0, level: "heavy" }] },
  winLine: { about: "The winner's line drawing through the board.", pulses: [{ at: 0, level: "light" }] },
  matchWon: { about: "You won the match: a quick climb that lands hard.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }, { at: 190, level: "heavy" }] },
  matchLost: { about: "You lost: one weight, then it fades.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  matchDrawn: { about: "A draw: a small shrug.", pulses: [{ at: 0, level: "light" }, { at: 110, level: "light" }] },
  champion: {
    about: "You are the champion, nothing is bigger: the climb, then three hard hits.",
    pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }, { at: 190, level: "heavy" }, { at: 390, level: "heavy" }, { at: 500, level: "heavy" }, { at: 610, level: "heavy" }],
  },
});

/** Everything a phone can feel. A new game adds its `games/<game>/haptics.ts` here. */
export const HAPTICS = {
  ...PLATFORM_HAPTICS,
  ...TICTACTOE_HAPTICS,
  ...ULTIMATE_HAPTICS,
  ...HEADCRASH_HAPTICS,
  ...TERRITORY_HAPTICS,
  ...DOTSCLASH_HAPTICS,
};

/** The plain name of any feel; a typo is a compile error. */
export type HapticName = keyof typeof HAPTICS;

export const HAPTIC_NAMES = Object.keys(HAPTICS) as HapticName[];

/**
 * A whole moment as one list of pulses in time order. A phone has one motor, so a pulse that would start before the
 * last one has finished is left out.
 */
export function pulsesOf(steps: readonly HapticStep<HapticName>[]): Pulse[] {
  const pulses = steps
    .flatMap((step) => HAPTICS[step.haptic].pulses.map((pulse) => ({ ...pulse, at: pulse.at + step.at })))
    .sort((a, b) => a.at - b.at);
  const kept: Pulse[] = [];
  let freeAt = 0;
  for (const pulse of pulses) {
    if (pulse.at < freeAt) continue;
    kept.push(pulse);
    freeAt = pulseEnd(pulse);
  }
  return kept;
}
