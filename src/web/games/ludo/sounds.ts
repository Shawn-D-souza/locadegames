import { LUDO_CONFIG } from "../../../shared/games/ludo/config";
import { defineSounds } from "../../sound/definition";
import { mallet, pop, swish, thump, tine, woodTap } from "../../sound/kit";
import { hz, PLAYER_NOTES, scaleStep, type ScaleNote } from "../../sound/pitch";
import { DICE_BOARD_HZ } from "../dice/sounds";

/** A pawn's hop: the first square's note, as a step up the scale from D4; each square after a step higher. */
const FIRST_HOP_NOTE = 5;
/** Steps in one octave of the pentatonic scale. */
const OCTAVE_STEPS = 5;

/** Where a note sits on the scale (`scaleStep` backwards). */
function stepOf(note: ScaleNote): number {
  let step = 0;
  while (scaleStep(step) !== note) step++;
  return step;
}

/**
 * A wooden board game on a desk, like Snakes & Ladders (the die is the shared one, `dice/sounds.ts`): a wooden pawn
 * tapping up the scale, popping out of its base, knocking another off its square, reaching home.
 */
export const LUDO_SOUNDS = defineSounds({
  ludoHop: {
    about: "A pawn lands on the next square: a wooden knock tuned a step up the scale each square, with the hollow board soft under it. Take = which hop of the move.",
    level: "quiet",
    room: 0.1,
    variants: 6,
    render(mix, hop) {
      mix.add(woodTap(mix, { hz: hz(scaleStep(FIRST_HOP_NOTE + hop)), decay: 0.04, hardness: 0.4 }));
      mix.add(woodTap(mix, { hz: DICE_BOARD_HZ, decay: 0.055, hardness: 0.2 }), { gain: 0.4 });
    },
  },
  ludoEnter: {
    about: "A pawn comes out of its base onto its start square (a 6): a round pop as it leaves, then its wooden knock landing a little higher. Out and into the race.",
    level: "event",
    room: 0.14,
    render(mix) {
      mix.add(pop(mix, { note: "A4" }), { gain: 0.7 });
      const lands = (LUDO_CONFIG.enterMs / 1000) * 0.78;
      mix.add(woodTap(mix, { hz: hz("D5"), decay: 0.045, hardness: 0.45 }), { at: lands, gain: 0.9 });
      mix.add(woodTap(mix, { hz: DICE_BOARD_HZ, decay: 0.055, hardness: 0.2 }), { at: lands, gain: 0.45 });
    },
  },
  ludoCapture: {
    about:
      "A pawn lands on another player's and sends it home: a hard wooden knock with a thump under it, then a falling swish as the captured pawn flies back to its base, and a small knock as it lands there. The big moment of Ludo.",
    level: "moment",
    room: 0.2,
    render(mix) {
      mix.add(woodTap(mix, { hz: 520, decay: 0.03, hardness: 0.8 }), { gain: 0.9 });
      mix.add(thump(mix, { hz: 120, drop: 1.6, decay: 0.07, drive: 1.5, box: 300 }), { gain: 0.6 });
      const flight = LUDO_CONFIG.captureMs / 1000;
      mix.add(swish(mix, { seconds: flight * 0.7, fromHz: 2_400, toHz: 500, peak: 0.4 }), { at: 0.05, gain: 0.5 });
      mix.add(mallet(mix, { note: "A4", ring: 0.1, hardness: 0.35 }), { at: 0.12, gain: 0.45 });
      mix.add(mallet(mix, { note: "E4", ring: 0.18, hardness: 0.3 }), { at: 0.26, gain: 0.45 });
      mix.add(woodTap(mix, { hz: 300, decay: 0.035, hardness: 0.3 }), { at: flight * 0.86, gain: 0.5 });
    },
  },
  ludoPawnHome: {
    about: "A pawn reaches home in the middle (not the last one): two bright tines, the second higher, one more of four in.",
    level: "event",
    room: 0.18,
    render(mix) {
      mix.add(tine(mix, { note: "E5", ring: 0.14, hardness: 0.45 }), { gain: 0.65 });
      mix.add(tine(mix, { note: "B5", ring: 0.24, hardness: 0.45 }), { at: 0.08, gain: 0.75 });
    },
  },
  ludoFinished: {
    about: "A player's last pawn gets home (anyone; quieter for others): a quick run of mallets up to their own note and a ring above it. Take = the player's color.",
    level: "moment",
    room: 0.28,
    variants: PLAYER_NOTES.length,
    render(mix, player) {
      const top = stepOf(PLAYER_NOTES[player]!);
      [-4, -2, 0].forEach((offset, i) => {
        mix.add(mallet(mix, { note: scaleStep(top + offset), ring: i === 2 ? 0.4 : 0.12, hardness: 0.5 }), { at: i * 0.08, gain: 0.6 + i * 0.12 });
      });
      mix.add(tine(mix, { note: scaleStep(top + OCTAVE_STEPS), ring: 0.35, hardness: 0.4 }), { at: 0.16, gain: 0.35 });
    },
  },
  ludoNoMove: {
    about: "A roll that moves nothing (no 6 to come out, or too big to get home): two dull, low knocks. Not this time.",
    level: "quiet",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 300, decay: 0.03, hardness: 0.25 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 250, decay: 0.035, hardness: 0.2 }), { at: 0.13, gain: 0.7 });
    },
  },
  ludoThreeSixes: {
    about: "A third 6 in a row: the turn is over, unplayed. A heavy blow, then two notes falling away.",
    level: "event",
    room: 0.22,
    render(mix) {
      mix.add(thump(mix, { hz: 110, drop: 1.8, decay: 0.09, drive: 1.6, box: 300 }), { gain: 0.75 });
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.3 }), { at: 0.12, gain: 0.55 });
      mix.add(mallet(mix, { note: "E4", ring: 0.26, hardness: 0.2 }), { at: 0.3, gain: 0.6 });
    },
  },
});
