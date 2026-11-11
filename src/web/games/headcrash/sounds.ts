import { defineSounds } from "../../sound/definition";
import { mallet, pop, scatter, stamp, swish, thump, woodTap } from "../../sound/kit";

/**
 * Head Crash is rubber and weight: wheels landing, two toy cars knocking, and one big moment per round, the hit.
 * Your point is a fat pop and two notes up; your own head being hit is a low blow and two notes down. Driving
 * itself is silent, so the hits stand out. A match you only watch is heard from further away.
 */
export const HEADCRASH_SOUNDS = defineSounds({
  headCrashLanding: {
    about: "Your car comes down on its wheels after a jump: rubber on a thick floor. The second take is a hard landing.",
    level: "tap",
    room: 0.1,
    variants: 2,
    cooldownMs: 140,
    render(mix, take) {
      const hard = take === 1;
      mix.add(thump(mix, { hz: hard ? 112 : 138, drop: 1.4, decay: hard ? 0.06 : 0.035, drive: hard ? 1.6 : 1.2, box: 320 }));
      mix.add(woodTap(mix, { hz: hard ? 420 : 520, decay: 0.016, hardness: 0.25 }), { gain: hard ? 0.45 : 0.3 });
    },
  },
  headCrashCarBump: {
    about: "The two cars knock into each other (they are solid and push each other): two rubbery toys touching.",
    level: "tap",
    room: 0.08,
    cooldownMs: 220,
    render(mix) {
      mix.add(thump(mix, { hz: 156, drop: 1.25, decay: 0.03, drive: 1.3, box: 420 }));
      mix.add(woodTap(mix, { hz: 700, decay: 0.012, hardness: 0.35 }), { gain: 0.4 });
    },
  },
  headCrashYouScored: {
    about: "You hit the other driver's head, or they crashed their own (the burst, the shake, your score going up): a fat pop, a stamp, and two notes up.",
    level: "moment",
    room: 0.16,
    render(mix) {
      mix.add(stamp(mix, { weight: 0.75 }), { gain: 0.7 });
      mix.add(pop(mix, { note: "D5", from: 0.6, glide: 0.012, decay: 0.09 }));
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.4 }), { at: 0.09, gain: 0.7 });
      mix.add(mallet(mix, { note: "D5", ring: 0.2, hardness: 0.4 }), { at: 0.18, gain: 0.8 });
    },
  },
  headCrashYouWereHit: {
    about: "Your own head is hit (by the other car, the arena or the water) and the point goes to the other driver: a low blow under the shake, then two notes falling.",
    level: "moment",
    room: 0.26,
    render(mix) {
      mix.add(thump(mix, { hz: 94, drop: 2.2, decay: 0.13, drive: 1.6, box: 270 }), { gain: 0.85 });
      mix.add(pop(mix, { note: "B4", from: 1.3, glide: 0.03, decay: 0.05 }), { gain: 0.5 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.12, hardness: 0.22 }), { at: 0.14, gain: 0.7 });
      mix.add(mallet(mix, { note: "B3", ring: 0.2, hardness: 0.16 }), { at: 0.29, gain: 0.75 });
    },
  },
  headCrashBothHeadsHit: {
    about: "Both heads are hit at the same moment and nobody scores: a knock and a small scatter.",
    level: "event",
    room: 0.2,
    render(mix) {
      mix.add(thump(mix, { hz: 120, drop: 1.6, decay: 0.07, drive: 1.5, box: 300 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 620, decay: 0.018, hardness: 0.6 }), { gain: 0.5 });
      mix.add(scatter(mix, { pieces: 8, seconds: 0.26, lowHz: 800, highHz: 1_900 }), { at: 0.01, gain: 0.55 });
    },
  },
  headCrashWatchedHit: {
    about: "A head is hit in a match you are watching: the knock alone, from a little further away.",
    level: "quiet",
    room: 0.26,
    render(mix) {
      mix.add(thump(mix, { hz: 126, drop: 1.5, decay: 0.06, drive: 1.3, box: 310 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 600, decay: 0.016, hardness: 0.5 }), { gain: 0.45 });
    },
  },
  headCrashSplash: {
    about: "The rising water reaches a head: a soft wash of water over the hit.",
    level: "event",
    room: 0.3,
    render(mix) {
      mix.add(swish(mix, { seconds: 0.5, fromHz: 2_600, toHz: 500, q: 0.7, peak: 0.12, grain: 0.5 }), { gain: 0.7 });
      mix.add(thump(mix, { hz: 86, drop: 1.5, decay: 0.09, drive: 1.1, box: 240 }), { gain: 0.4 });
    },
  },
  headCrashWaterRising: {
    about: "The water starts to rise (its edge turns coral and blinks): a slow swell of air and one low note, a warning without alarm.",
    level: "quiet",
    room: 0.3,
    render(mix) {
      mix.add(swish(mix, { seconds: 0.9, fromHz: 400, toHz: 1_500, q: 0.9, peak: 0.7, grain: 0.2 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "B3", ring: 0.4, hardness: 0.15 }), { at: 0.1, gain: 0.7 });
    },
  },
});
