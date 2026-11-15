import { defineSounds } from "../../sound/definition";
import { mallet, markerStroke, paperTick, pop, tine } from "../../sound/kit";
import { scaleStep } from "../../sound/pitch";

/** Boxes won in one turn climb the scale, one step a box; a long run stays on the top take. */
export const BOX_TAKES = 6;
/** Different strokes for the pen, so a run of lines never sounds like one sample repeating. */
export const LINE_TAKES = 4;
/** The first box's note, as a step up the scale from D4 (A4); later boxes in the same turn climb from here. */
const FIRST_BOX_STEP = 3;
/** Steps in one octave of the pentatonic scale. */
const OCTAVE_STEPS = 5;

/** Pen and paper, then a round pop for every box: a quick felt-tip line, and a box filling in with a note that climbs as a turn takes a run of them. */
export const DOTSBOXES_SOUNDS = defineSounds({
  dotsBoxesLine: {
    about: "A line is drawn between two dots (anyone's): a short felt-tip stroke with a tick as the pen lifts. Takes: different strokes.",
    level: "event",
    room: 0.08,
    variants: LINE_TAKES,
    render(mix, take) {
      mix.add(markerStroke(mix, 0.09 + take * 0.012), { gain: 0.8 });
      mix.add(paperTick(mix, { hz: 2_400 + take * 180 }), { at: 0.085 + take * 0.012, gain: 0.35 });
    },
  },
  dotsBoxesBox: {
    about: "Someone else wins a box: a round pop, a step higher for every box they win in the same turn. Take = boxes already won this turn.",
    level: "event",
    room: 0.12,
    variants: BOX_TAKES,
    cooldownMs: 50,
    render(mix, run) {
      const note = scaleStep(FIRST_BOX_STEP + run);
      mix.add(pop(mix, { note, from: 0.7, glide: 0.012, decay: 0.08 }));
      mix.add(mallet(mix, { note, ring: 0.12, hardness: 0.3 }), { at: 0.015, gain: 0.35 });
    },
  },
  dotsBoxesYourBox: {
    about: "You win a box: the same round pop, fuller, with a bright ring an octave up, a step higher for every box you win in the same turn. Take = boxes already won this turn.",
    level: "event",
    room: 0.14,
    variants: BOX_TAKES,
    cooldownMs: 50,
    render(mix, run) {
      const step = FIRST_BOX_STEP + run;
      mix.add(pop(mix, { note: scaleStep(step), from: 0.66, glide: 0.014, decay: 0.1 }));
      mix.add(mallet(mix, { note: scaleStep(step), ring: 0.16, hardness: 0.4 }), { at: 0.012, gain: 0.5 });
      mix.add(tine(mix, { note: scaleStep(step + OCTAVE_STEPS), ring: 0.14, hardness: 0.35 }), { at: 0.03, gain: 0.22 });
    },
  },
});
