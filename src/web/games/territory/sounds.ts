import { defineSounds, LOOP_CROSSFADE } from "../../sound/definition";
import { mallet, markerStroke, paperTick, pop, scatter, stamp, swish, thump, tine, woodTap } from "../../sound/kit";
import type { Mix } from "../../sound/mix";
import type { ScaleNote } from "../../sound/pitch";

/** Each capture runs up a different part of the same chord, so captures in a row don't sound stamped out. */
const CAPTURE_RUNS: readonly (readonly ScaleNote[])[] = [
  ["A4", "D5", "F#5", "A5", "D6"],
  ["B4", "D5", "F#5", "B5", "E6"],
  ["D5", "F#5", "A5", "D6", "F#6"],
];
const RUN_GAP = 0.042;

/** The notes of a run, quick enough to be one gesture; returns when the last one starts. */
function noteRun(mix: Mix, notes: readonly ScaleNote[], ring: number): number {
  notes.forEach((note, i) => mix.add(mallet(mix, { note, ring: ring * (0.7 + (0.3 * i) / notes.length), hardness: 0.38 }), { at: RUN_GAP * i, gain: 0.72 + (0.28 * i) / notes.length }));
  return RUN_GAP * (notes.length - 1);
}

const TRAIL_SECONDS = 2.6;

const STAMP_LANDS = 0.17;
const HEAD_DROP_SECONDS = 0.38;

/**
 * Territory is a marker on paper and notes. Your land is a run of rising notes, a knockout you made is a fat pop, your
 * own knockout a low blow and a soft fall. What others do to each other's land is seen, not heard.
 */
export const TERRITORY_SOUNDS = defineSounds({
  territoryTrailLoop: {
    about: "Loop: you're out of your land, drawing your trail. A felt marker on paper, very quiet, getting a little faster and higher the longer you stay out. On someone else's land the same marker goes darker, slower and heavier, easing there and back, so it never breaks.",
    level: "faint",
    room: 0,
    loopSeconds: TRAIL_SECONDS,
    render(mix) {
      mix.add(markerStroke(mix, TRAIL_SECONDS + LOOP_CROSSFADE));
    },
  },
  territoryLeftLand: {
    about: "Your head leaves your land and the trail starts: the pen touching down.",
    level: "quiet",
    room: 0.08,
    render(mix) {
      mix.add(woodTap(mix, { hz: 720, decay: 0.012, hardness: 0.3 }));
      mix.add(paperTick(mix, { hz: 1_800, decay: 0.01 }), { gain: 0.5 });
    },
  },
  territoryCaptureSmall: {
    about: "You got home with a small loop: two notes running up, the land rising, and a tiny settle. No stamp.",
    level: "tap",
    room: 0.2,
    variants: CAPTURE_RUNS.length,
    render(mix, take) {
      const last = noteRun(mix, CAPTURE_RUNS[take]!.slice(1, 3), 0.13);
      mix.add(woodTap(mix, { hz: 480, decay: 0.016, hardness: 0.25 }), { at: last + 0.03, gain: 0.35 });
    },
  },
  territoryCaptureMedium: {
    about: "A good loop: the run goes further, and the land settles with a soft weight.",
    level: "event",
    room: 0.24,
    variants: CAPTURE_RUNS.length,
    render(mix, take) {
      const last = noteRun(mix, CAPTURE_RUNS[take]!.slice(0, 4), 0.16);
      mix.add(thump(mix, { hz: 118, decay: 0.05, drive: 1.2, box: 320 }), { at: last + 0.04, gain: 0.45 });
    },
  },
  territoryCaptureLarge: {
    about: "A huge loop: the whole run, starting from a low note, and a big block of land settling.",
    level: "event",
    room: 0.3,
    variants: CAPTURE_RUNS.length,
    render(mix, take) {
      mix.add(mallet(mix, { note: "D4", ring: 0.3, hardness: 0.35 }), { gain: 0.7 });
      const last = noteRun(mix, CAPTURE_RUNS[take]!, 0.24);
      mix.add(thump(mix, { hz: 92, decay: 0.1, drive: 1.3, box: 280 }), { at: last + 0.05, gain: 0.65 });
    },
  },
  territoryYouKnockedSomeoneOut: {
    about: "You knocked someone out: one round, fat pop as CUT BEN! or TOOK BEN'S LAND! stamps on, and it's over quickly. Nothing bright, nothing ringing on.",
    level: "moment",
    room: 0.14,
    render(mix) {
      mix.add(stamp(mix, { weight: 0.7 }), { at: STAMP_LANDS, gain: 0.7 });
      mix.add(pop(mix, { note: "D5", from: 0.6, glide: 0.012, decay: 0.09 }), { at: STAMP_LANDS });
      mix.add(mallet(mix, { note: "D4", ring: 0.1, hardness: 0.3 }), { at: STAMP_LANDS, gain: 0.7 });
    },
  },
  territoryYouAreOut: {
    about: "You're out, cut or with no land left (hard shake, your head bursts): a low blow under the shake, then a soft fall as the card comes up.",
    level: "moment",
    room: 0.3,
    render(mix) {
      mix.add(thump(mix, { hz: 92, drop: 2.2, decay: 0.14, drive: 1.6, box: 270 }), { gain: 0.85 });
      mix.add(pop(mix, { note: "B4", from: 1.3, glide: 0.03, decay: 0.05 }), { gain: 0.5 });
      mix.add(mallet(mix, { note: "B4", ring: 0.1, hardness: 0.25 }), { at: 0.13, gain: 0.65 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.12, hardness: 0.2 }), { at: 0.27, gain: 0.7 });
      mix.add(mallet(mix, { note: "D4", ring: 0.2, hardness: 0.15 }), { at: 0.43, gain: 0.75 });
    },
  },
  territoryPlayerBurst: {
    about: "Someone else goes out and their head bursts apart: a small scatter of pieces. Quieter the further away it is.",
    level: "quiet",
    room: 0.2,
    variants: 3,
    render(mix) {
      mix.add(woodTap(mix, { hz: 640, decay: 0.018, hardness: 0.7 }));
      mix.add(scatter(mix, { pieces: 10, seconds: 0.3, lowHz: 800, highHz: 2_000 }), { at: 0.008, gain: 0.7 });
    },
  },
  territoryPlayerQuit: {
    about: "Someone quit (the notice pops up under the clock): a soft step down.",
    level: "faint",
    room: 0.16,
    render(mix) {
      mix.add(woodTap(mix, { hz: 560, decay: 0.014, hardness: 0.35 }));
      mix.add(woodTap(mix, { hz: 400, decay: 0.018, hardness: 0.25 }), { at: 0.07 });
    },
  },
  territoryHeadBump: {
    about: "Your head bumps into another head (heads are solid, both stop): two rubbery blocks touching.",
    level: "tap",
    room: 0.08,
    cooldownMs: 300,
    render(mix) {
      mix.add(thump(mix, { hz: 150, drop: 1.25, decay: 0.03, drive: 1.3, box: 410 }));
      mix.add(woodTap(mix, { hz: 690, decay: 0.012, hardness: 0.3 }), { gain: 0.4 });
    },
  },
  territoryWallBump: {
    about: "Your head reaches the arena's wall (you then slide along it): a dull knock on a thick edge.",
    level: "tap",
    room: 0.1,
    cooldownMs: 400,
    render(mix) {
      mix.add(thump(mix, { hz: 118, drop: 1.4, decay: 0.045, drive: 1.5, box: 300 }));
      mix.add(woodTap(mix, { hz: 450, decay: 0.022, hardness: 0.25 }), { gain: 0.5 });
    },
  },
  territoryMatchOver: {
    about: "The match ends for everyone: the arena thumps, then the camera pulls out to the whole arena with a long breath of air.",
    level: "moment",
    room: 0.3,
    render(mix) {
      mix.add(thump(mix, { hz: 100, drop: 1.9, decay: 0.11, drive: 1.8, box: 300 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 500, decay: 0.03, hardness: 0.5 }), { gain: 0.36 });
      mix.add(swish(mix, { seconds: 0.6, fromHz: 2_400, toHz: 620, q: 0.8, peak: 0.25, grain: 0.15, curve: (p) => 1 - Math.pow(1 - p, 2) }), { at: 0.04, gain: 0.4 });
    },
  },
  territoryWinnerHeadDrop: {
    about: `A big copy of the winner's head falls onto them with a crown: air whistling down for ${HEAD_DROP_SECONDS * 1000} ms, then a landing with a little ring.`,
    level: "event",
    room: 0.26,
    render(mix) {
      mix.add(swish(mix, { seconds: HEAD_DROP_SECONDS, fromHz: 2_800, toHz: 900, q: 2, peak: 0.85, grain: 0.05 }), { gain: 0.42 });
      mix.add(thump(mix, { hz: 112, decay: 0.06, box: 330 }), { at: HEAD_DROP_SECONDS, gain: 0.85 });
      mix.add(tine(mix, { note: "D6", ring: 0.14, hardness: 0.5 }), { at: HEAD_DROP_SECONDS + 0.012, gain: 0.34 });
    },
  },
});

