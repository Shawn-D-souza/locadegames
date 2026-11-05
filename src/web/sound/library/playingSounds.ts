import { defineSounds } from "../definition";
import { mallet, pop, stamp, tine, woodTap } from "../kit";
import type { ScaleNote } from "../pitch";

export const COUNTDOWN_NOTES: readonly ScaleNote[] = ["A4", "B4", "D5"];
export const TIMER_TAKES = 5;
/** The last seconds' second tick comes this soon after the first. */
const TIMER_DOUBLE_GAP = 0.14;
const LAST_TWO = TIMER_TAKES - 2;

/** Turns, timers and countdowns, shared by every game. They should be clear with your eyes elsewhere, and never nag. */
export const PLAYING_SOUNDS = defineSounds({
  countdownTick: {
    about: "A number of a countdown pops (3, 2, 1 before a round or a Territory match). Take 0, 1, 2 climb the scale towards GO.",
    level: "event",
    room: 0.2,
    variants: COUNTDOWN_NOTES.length,
    render(mix, step) {
      mix.add(woodTap(mix, { hz: 680 + step * 60, decay: 0.02, hardness: 0.7 }), { gain: 0.55 });
      mix.add(mallet(mix, { note: COUNTDOWN_NOTES[step]!, ring: 0.11, hardness: 0.7 }));
    },
  },
  countdownGo: {
    about: "The countdown ends and play begins: the 3, 2, 1's own wood and mallet, the last number's note still there with a higher one on top, held longer on a small landing.",
    level: "moment",
    room: 0.26,
    render(mix) {
      mix.add(woodTap(mix, { hz: 860, decay: 0.02, hardness: 0.7 }), { gain: 0.55 });
      mix.add(stamp(mix, { weight: 0.35 }), { gain: 0.4 });
      mix.add(mallet(mix, { note: "A5", ring: 0.26, hardness: 0.7 }));
      mix.add(mallet(mix, { note: "D5", ring: 0.24, hardness: 0.6 }), { gain: 0.6 });
    },
  },
  timerTick: {
    about: "A clock's last seconds (your last 5 s on a turn, Territory's last 10 s). A tight little tick on one note, no tune. Take 0 → 4 gets firmer, and the last two seconds tick twice.",
    level: "event",
    room: 0.06,
    variants: TIMER_TAKES,
    render(mix, urgency) {
      const tick = (at: number, gain: number) => {
        mix.add(pop(mix, { note: "D5", from: 0.85, glide: 0.006, decay: 0.012 + urgency * 0.001 }), { at, gain: gain * 0.7 });
        mix.add(tine(mix, { note: "D6", ring: 0.012, hardness: 0.3 + urgency * 0.08 }), { at, gain });
      };
      tick(0, 1);
      if (urgency >= LAST_TWO) tick(TIMER_DOUBLE_GAP, 0.75);
    },
  },
  otherMatchEnded: {
    about: "On the points screen, another match of the round finishes and gets its tick.",
    level: "quiet",
    room: 0.2,
    render(mix) {
      mix.add(woodTap(mix, { hz: 760, decay: 0.012, hardness: 0.5 }), { gain: 0.7 });
      mix.add(tine(mix, { note: "D6", ring: 0.08, hardness: 0.3 }), { at: 0.03 });
    },
  },
});
