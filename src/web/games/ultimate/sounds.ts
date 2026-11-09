import { durations } from "../../../theme";
import { boardOf, smallCells } from "../../../shared/games/ultimate/rules";
import type { UltimateState } from "../../../shared/games/ultimate/types";
import { defineSounds } from "../../sound/definition";
import { mallet, pop, stamp, woodTap } from "../../sound/kit";
import type { ScaleNote } from "../../sound/pitch";

/** A small climb as a small board fills, by how many marks it holds, staying low: there are many marks in a game, none of them a melody. */
const X_STEPS: readonly ScaleNote[] = ["A4", "A4", "A4", "B4", "B4", "B4", "D5", "D5", "D5"];
const O_STEPS: readonly ScaleNote[] = ["F#4", "F#4", "F#4", "A4", "A4", "A4", "B4", "B4", "B4"];

/** A won board's line draws first (from the sound's start), then the big mark stamps on; spring easing passes its end point at about a third of its length. */
const LINE_SECONDS = durations.lineDraw / 1000;
const CLAIM_LANDS = LINE_SECONDS + (durations.celebrate / 1000) * 0.34;

/** Each mark a small, round bop (a little lighter than tic-tac-toe's: a game has many more); a small board won is stamped. */
export const ULTIMATE_SOUNDS = defineSounds({
  ultimateMarkX: {
    about: "An X lands: one small round bop, a little higher and shorter than O, so you can tell who moved. Take = marks already in that small board; a small climb as it fills.",
    level: "event",
    room: 0.1,
    variants: X_STEPS.length,
    render(mix, filled) {
      mix.add(pop(mix, { note: X_STEPS[filled]!, from: 0.74, glide: 0.009, decay: 0.06 }));
    },
  },
  ultimateMarkO: {
    about: "An O lands: one small round bop, a little lower and longer than X, so you can tell who moved. Take = marks already in that small board; a small climb as it fills.",
    level: "event",
    room: 0.1,
    variants: O_STEPS.length,
    render(mix, filled) {
      mix.add(pop(mix, { note: O_STEPS[filled]!, from: 0.74, glide: 0.011, decay: 0.075 }));
    },
  },
  ultimateYouClaimedBoard: {
    about: "You won a small board: a quick scoop as its line slashes through, then your big mark stamps onto it with two bright notes going up. Good, but the game isn't over, so it stays smaller than a win.",
    level: "event",
    room: 0.18,
    render(mix) {
      mix.add(pop(mix, { note: "D5", from: 0.66, glide: 0.035, decay: 0.07 }), { gain: 0.6 });
      mix.add(stamp(mix, { weight: 0.55 }), { at: CLAIM_LANDS, gain: 0.75 });
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.6 }), { at: CLAIM_LANDS, gain: 0.8 });
      mix.add(mallet(mix, { note: "D5", ring: 0.22, hardness: 0.6 }), { at: CLAIM_LANDS + 0.09 });
    },
  },
  ultimateBoardClaimed: {
    about: "The other player won a small board (or a player you're watching did): a soft scoop as its line slashes through, then their big mark stamps on with one low note. News, not a defeat.",
    level: "event",
    room: 0.18,
    render(mix) {
      mix.add(pop(mix, { note: "A4", from: 0.7, glide: 0.035, decay: 0.07 }), { gain: 0.45 });
      mix.add(stamp(mix, { weight: 0.45 }), { at: CLAIM_LANDS, gain: 0.7 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.16, hardness: 0.35 }), { at: CLAIM_LANDS, gain: 0.75 });
    },
  },
  ultimateBoardFilledUp: {
    about: "A small board filled up with no line: it counts for nobody and goes quiet. Two dull wooden knocks.",
    level: "quiet",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 420, decay: 0.02, hardness: 0.35 }));
      mix.add(woodTap(mix, { hz: 360, decay: 0.024, hardness: 0.3 }), { at: 0.1, gain: 0.8 });
    },
  },
});

export type UltimateMarkSound = "ultimateMarkX" | "ultimateMarkO";

/** The sound of the mark just placed, and its take (how many marks its small board held before it). */
export function lastMarkSound(game: UltimateState): { sound: UltimateMarkSound; variant: number } | null {
  if (game.lastMove === null) return null;
  const seat = game.cells[game.lastMove];
  if (seat === null || seat === undefined) return null;
  const filled = smallCells(game.cells, boardOf(game.lastMove)).filter((cell) => cell !== null).length - 1;
  return { sound: seat === 0 ? "ultimateMarkX" : "ultimateMarkO", variant: filled };
}
