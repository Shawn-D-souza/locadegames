import type { PlayedMove } from "../../../shared/games/chess/types";
import { defineSounds } from "../../sound/definition";
import { mallet, tine, woodTap } from "../../sound/kit";
import type { ScaleNote } from "../../sound/pitch";
import type { SoundStep } from "../../sound/soundBook";
import { landsAtMs } from "./moveTiming";

/** A pawn promoted: a quick rising call on the mallets with a tine on top, in the app's scale. */
const PROMOTE_NOTES: readonly ScaleNote[] = ["D5", "F#5", "A5"];
/** Check: two notes on the tines, a falling call that says look (never an alarm: it's part of the game). */
const CHECK_NOTES: readonly ScaleNote[] = ["A5", "E5"];
/** The check sounds a moment after the piece lands, so the two don't blur. */
const CHECK_AFTER_MS = 70;

/**
 * Weighted wooden pieces on a wooden board: a move is one low, soft tock as the piece sets down (heavier than a
 * checker), a capture a hard knock on the piece taken then the tock, castling two set-downs (king, then rook), check a
 * short falling call, a promotion a rising one.
 */
export const CHESS_SOUNDS = defineSounds({
  chessMove: {
    about: "A piece sets down on its new square: one low, soft wooden tock. Take = played in turn, so repeats don't sound stamped out.",
    level: "event",
    room: 0.12,
    variants: 3,
    render(mix, take) {
      mix.add(woodTap(mix, { hz: 360 + take * 30, decay: 0.045, hardness: 0.3 }));
    },
  },
  chessCapture: {
    about: "A piece takes another: a hard knock on the piece taken, then the mover's tock as it sets down.",
    level: "event",
    room: 0.14,
    render(mix) {
      mix.add(woodTap(mix, { hz: 940, decay: 0.026, hardness: 0.9 }));
      mix.add(woodTap(mix, { hz: 380, decay: 0.045, hardness: 0.4 }), { at: 0.035, gain: 0.85 });
    },
  },
  chessCastle: {
    about: "Castling: the king sets down, then the rook beside it, two tocks close together.",
    level: "event",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 350, decay: 0.045, hardness: 0.32 }));
      mix.add(woodTap(mix, { hz: 410, decay: 0.04, hardness: 0.32 }), { at: 0.085, gain: 0.85 });
    },
  },
  chessCheck: {
    about: "A move puts a king in check: two falling notes on the tines, a call to look.",
    level: "event",
    room: 0.2,
    render(mix) {
      CHECK_NOTES.forEach((note, i) => mix.add(tine(mix, { note, ring: 0.22, hardness: 0.6 }), { at: i * 0.09, gain: 0.8 }));
    },
  },
  chessPromote: {
    about: "A pawn reaches the far row and becomes a new piece: a quick rising call on the mallets with a tine on top.",
    level: "event",
    room: 0.2,
    render(mix) {
      PROMOTE_NOTES.forEach((note, i) => mix.add(mallet(mix, { note, ring: 0.22, hardness: 0.55 }), { at: i * 0.07, gain: 0.85 }));
      mix.add(tine(mix, { note: "D6", ring: 0.3 }), { at: 0.14, gain: 0.4 });
    },
  },
});

/** The sounds of a move as it plays out (`startMs`: when it starts): its landing, then a promotion, then check. */
export function moveSoundSteps(move: Pick<PlayedMove, "captured" | "castle" | "promotion" | "check">, startMs = 0): SoundStep[] {
  const lands = startMs + landsAtMs;
  const steps: SoundStep[] = [{ sound: move.captured ? "chessCapture" : move.castle ? "chessCastle" : "chessMove", at: lands }];
  if (move.promotion) steps.push({ sound: "chessPromote", at: lands });
  if (move.check) steps.push({ sound: "chessCheck", at: lands + CHECK_AFTER_MS });
  return steps;
}
