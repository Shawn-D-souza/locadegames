import { defineSounds } from "../../sound/definition";
import { bubble, mallet, pop, thump, tine } from "../../sound/kit";
import { PLAYER_NOTES, scaleStep, type ScaleNote } from "../../sound/pitch";

/** A dot going down climbs as its cell fills: 1, 2, 3 dots. */
const DOT_NOTES: readonly ScaleNote[] = ["F#4", "A4", "B4"];
/** Each wave of a chain bursts a step higher than the last, so a long chain runs up the scale. */
export const BURST_TAKES = 8;
/** The first wave's note, as a step up the scale from D4 (F#4); later waves climb from here. */
const FIRST_BURST_STEP = 2;
/** Steps in one octave of the pentatonic scale. */
const OCTAVE_STEPS = 5;

/** Where a note sits on the scale (`scaleStep` backwards). */
function stepOf(note: ScaleNote): number {
  let step = 0;
  while (scaleStep(step) !== note) step++;
  return step;
}

/** The same note an octave down (every player's note is from the 4th octave up, so this stays on the scale). */
function octaveBelow(note: ScaleNote): ScaleNote {
  return `${note.slice(0, -1)}${Number(note.slice(-1)) - 1}` as ScaleNote;
}

/** Toy-box dots: round pops that fill up, bubbles bursting a step higher each wave, a heavy plop when someone is out. */
export const DOTSCLASH_SOUNDS = defineSounds({
  dotsClashStartPicked: {
    about: "A player picks their starting cell: a soft round pop on their own note. Take = the player's color.",
    level: "event",
    room: 0.12,
    variants: PLAYER_NOTES.length,
    render(mix, player) {
      mix.add(pop(mix, { note: PLAYER_NOTES[player]!, from: 0.7, glide: 0.012, decay: 0.07 }));
      mix.add(mallet(mix, { note: PLAYER_NOTES[player]!, ring: 0.1, hardness: 0.3 }), { at: 0.02, gain: 0.45 });
    },
  },
  dotsClashDotAdded: {
    about: "A dot goes onto a cell that doesn't burst: a small bop, higher the fuller the cell. Take = dots now on it, less one.",
    level: "event",
    room: 0.1,
    variants: DOT_NOTES.length,
    render(mix, filled) {
      mix.add(pop(mix, { note: DOT_NOTES[filled]!, from: 0.72, glide: 0.01, decay: 0.06 }));
    },
  },
  dotsClashBurst: {
    about:
      "A wave of a chain bursts: a juicy bubble pop with a soft weight under it and a little ring an octave up, one step higher each wave. Take = the wave (later waves stay on the top one).",
    level: "event",
    room: 0.16,
    variants: BURST_TAKES,
    cooldownMs: 60,
    render(mix, wave) {
      const step = FIRST_BURST_STEP + wave;
      mix.add(bubble(mix, { note: scaleStep(step) }));
      mix.add(thump(mix, { hz: 120, drop: 1.4, decay: 0.045, drive: 1.4, box: 280 }), { gain: 0.35 });
      mix.add(tine(mix, { note: scaleStep(step + OCTAVE_STEPS), ring: 0.08, hardness: 0.35 }), { at: 0.015, gain: 0.16 });
    },
  },
  dotsClashPlayerOut: {
    about:
      "A player is knocked out (yours or anyone's): a heavy plop, a big low bubble, then their own note falling softly away. Take = the player's color.",
    level: "event",
    room: 0.22,
    variants: PLAYER_NOTES.length,
    render(mix, player) {
      const note = PLAYER_NOTES[player]!;
      mix.add(thump(mix, { hz: 96, drop: 1.8, decay: 0.1, drive: 1.7, box: 250 }), { gain: 0.8 });
      mix.add(bubble(mix, { note: octaveBelow(note), size: 1.4 }), { gain: 0.8 });
      mix.add(mallet(mix, { note, ring: 0.12, hardness: 0.3 }), { at: 0.1, gain: 0.5 });
      mix.add(mallet(mix, { note: scaleStep(stepOf(note) - 2), ring: 0.22, hardness: 0.2 }), { at: 0.22, gain: 0.5 });
    },
  },
  dotsClashYouAreOut: {
    about: "Your last cell is gone, you're out: a deep blow and a big low bubble, then your note falling away down the scale. Take = your color.",
    level: "moment",
    room: 0.3,
    variants: PLAYER_NOTES.length,
    render(mix, player) {
      const note = PLAYER_NOTES[player]!;
      const step = stepOf(note);
      mix.add(thump(mix, { hz: 110, drop: 1.8, decay: 0.1, drive: 1.6, box: 300 }), { gain: 0.75 });
      mix.add(bubble(mix, { note: octaveBelow(note), size: 1.1 }), { gain: 0.55 });
      mix.add(mallet(mix, { note, ring: 0.12, hardness: 0.3 }), { at: 0.14, gain: 0.55 });
      mix.add(mallet(mix, { note: scaleStep(step - 2), ring: 0.14, hardness: 0.25 }), { at: 0.28, gain: 0.6 });
      mix.add(mallet(mix, { note: scaleStep(step - 3), ring: 0.26, hardness: 0.18 }), { at: 0.44, gain: 0.65 });
    },
  },
});
