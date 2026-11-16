import { defineSounds } from "../../sound/definition";
import { mallet, pop, swish, tine, woodTap } from "../../sound/kit";
import { scaleStep } from "../../sound/pitch";

/** Different flicks of a card, so a run of turns never sounds like one sample repeating. */
export const FLIP_TAKES = 4;
/** Pairs found in a row by the same player climb the scale, one step a pair; a long run stays on the top take. */
export const PAIR_TAKES = 6;
/** The first pair's note, as a step up the scale from D4 (A4); later pairs in the same turn climb from here. */
const FIRST_PAIR_STEP = 3;
/** Steps in one octave of the pentatonic scale. */
const OCTAVE_STEPS = 5;
/** A pair rings its note twice, close together: two cards that match. */
const SECOND_CARD = 0.07;

/**
 * Cards on a table: a card flicked over (a quick breath of air and a crisp card tap), a pair found as the same note
 * twice (two cards that match) climbing with each pair in a row, a miss as two soft notes falling, and the two cards
 * turning back.
 */
export const MEMORY_SOUNDS = defineSounds({
  memoryFlip: {
    about: "A card is turned over (anyone's): a quick breath of air and a crisp card tap as it lands face up. Takes: different flicks.",
    level: "event",
    room: 0.08,
    variants: FLIP_TAKES,
    render(mix, take) {
      mix.add(swish(mix, { seconds: 0.07, fromHz: 1_800 + take * 150, toHz: 3_400, q: 1.4, peak: 0.6, grain: 0.15 }), { gain: 0.55 });
      mix.add(woodTap(mix, { hz: 1_900 + take * 140, decay: 0.012, hardness: 0.7 }), { at: 0.06, gain: 0.7 });
    },
  },
  memoryPair: {
    about: "Someone else finds a pair: the same round note twice, close together, a step higher for every pair they find in a row. Take = pairs already found this turn.",
    level: "event",
    room: 0.12,
    variants: PAIR_TAKES,
    cooldownMs: 50,
    render(mix, run) {
      const note = scaleStep(FIRST_PAIR_STEP + run);
      for (const at of [0, SECOND_CARD]) {
        mix.add(pop(mix, { note, from: 0.7, glide: 0.012, decay: 0.07 }), { at, gain: 0.8 });
        mix.add(mallet(mix, { note, ring: 0.12, hardness: 0.3 }), { at: at + 0.012, gain: 0.35 });
      }
    },
  },
  memoryYourPair: {
    about: "You find a pair: the same note twice, fuller, with a bright ring an octave up, a step higher for every pair you find in a row. Take = pairs already found this turn.",
    level: "event",
    room: 0.14,
    variants: PAIR_TAKES,
    cooldownMs: 50,
    render(mix, run) {
      const step = FIRST_PAIR_STEP + run;
      for (const at of [0, SECOND_CARD]) {
        mix.add(pop(mix, { note: scaleStep(step), from: 0.66, glide: 0.014, decay: 0.09 }), { at });
        mix.add(mallet(mix, { note: scaleStep(step), ring: 0.16, hardness: 0.4 }), { at: at + 0.012, gain: 0.5 });
      }
      mix.add(tine(mix, { note: scaleStep(step + OCTAVE_STEPS), ring: 0.18, hardness: 0.35 }), { at: SECOND_CARD + 0.02, gain: 0.24 });
    },
  },
  memoryMiss: {
    about: "Two cards that don't match: two soft felt notes falling (bad news falls), quietly, so a miss never scolds.",
    level: "event",
    room: 0.1,
    render(mix) {
      mix.add(mallet(mix, { note: "A4", ring: 0.14, hardness: 0.2 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.2, hardness: 0.2 }), { at: 0.11, gain: 0.55 });
    },
  },
  memoryTurnBack: {
    about: "A miss's two cards turn back face down together: a soft double flick, lower and quieter than turning one up.",
    level: "quiet",
    room: 0.06,
    render(mix) {
      for (const at of [0, 0.035]) {
        mix.add(swish(mix, { seconds: 0.06, fromHz: 2_400, toHz: 1_300, q: 1.3, peak: 0.4, grain: 0.15 }), { at, gain: 0.45 });
        mix.add(woodTap(mix, { hz: 1_500, decay: 0.01, hardness: 0.5 }), { at: at + 0.05, gain: 0.5 });
      }
    },
  },
});
