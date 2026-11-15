import type { PlayedMove } from "../../../shared/games/checkers/types";
import { defineSounds } from "../../sound/definition";
import { mallet, tine, woodTap } from "../../sound/kit";
import type { ScaleNote } from "../../sound/pitch";
import type { SoundName, SoundStep } from "../../sound/soundBook";
import { landsAtMs } from "./moveTiming";

/** A chain of jumps climbs: each further capture a step higher, so a double or a triple sounds like one. */
const CAPTURE_STEPS = 4;

/** Each further capture in a chain is this many semitones higher (wood isn't tuned to notes). */
const climb = (step: number) => Math.pow(2, (step * 2) / 12);

/** A man crowned: a short rising call on the mallets with a tine on top, in the app's scale. */
const CROWN_NOTES: readonly ScaleNote[] = ["A4", "D5", "F#5"];

/**
 * Wooden pieces on a wooden board: a step is one soft tock as it sets down, a jump a clean double clack (one piece
 * striking the other; owner pick by ear out of four), and a crowning a little rising call.
 */
export const CHECKERS_SOUNDS = defineSounds({
  checkersStep: {
    about: "A piece slides one square and sets down: one soft wooden tock. Take = played in turn, so repeats don't sound stamped out.",
    level: "event",
    room: 0.1,
    variants: 3,
    render(mix, take) {
      mix.add(woodTap(mix, { hz: 520 + take * 35, decay: 0.03, hardness: 0.35 }));
    },
  },
  checkersCapture: {
    about: "A piece jumps one of the other's and lands: a clean double clack, one wooden piece striking the other. Take = which capture in a chain (0 first): each one a step higher.",
    level: "event",
    room: 0.12,
    variants: CAPTURE_STEPS,
    render(mix, step) {
      const pitch = climb(step);
      mix.add(woodTap(mix, { hz: 1_000 * pitch, decay: 0.028, hardness: 0.9 }));
      mix.add(woodTap(mix, { hz: 1_260 * pitch, decay: 0.022, hardness: 0.95 }), { at: 0.026, gain: 0.7 });
    },
  },
  checkersCrowned: {
    about: "A man reaches the far row and is crowned king: a quick rising call on the mallets with a tine on top.",
    level: "event",
    room: 0.2,
    render(mix) {
      CROWN_NOTES.forEach((note, i) => mix.add(mallet(mix, { note, ring: 0.22, hardness: 0.55 }), { at: i * 0.07, gain: 0.85 }));
      mix.add(tine(mix, { note: "A5", ring: 0.3 }), { at: 0.14, gain: 0.4 });
    },
  },
});

/** The sounds of a move as it plays out (`startMs`: when it starts), one per square it lands on, then the crown. */
export function moveSoundSteps(move: Pick<PlayedMove, "path" | "captured" | "crowned">, startMs = 0): SoundStep[] {
  const steps: SoundStep[] = move.path.map((_, hop) => {
    const sound: SoundName = move.captured.length > 0 ? "checkersCapture" : "checkersStep";
    return { sound, at: startMs + landsAtMs(hop + 1), ...(sound === "checkersCapture" ? { variant: Math.min(hop, CAPTURE_STEPS - 1) } : {}) };
  });
  if (move.crowned) steps.push({ sound: "checkersCrowned", at: startMs + landsAtMs(move.path.length) });
  return steps;
}
