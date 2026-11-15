import { FOURINAROW_CONFIG } from "../../../shared/games/fourinarow/config";
import { rowOf } from "../../../shared/games/fourinarow/rules";
import type { FourInARowState, Seat } from "../../../shared/games/fourinarow/types";
import { durations } from "../../../theme";
import { defineSounds, type SoundDefinition } from "../../sound/definition";
import { bandpass } from "../../sound/dsp/filters";
import { ring } from "../../sound/dsp/modes";
import { envelope, layer, noise, strike } from "../../sound/dsp/signal";
import type { Mix } from "../../sound/mix";
import { isRinged } from "./discMark";
import { DISC_BOUNCE, fallMs } from "./drop";

/**
 * How high the clack's plastic body sits, by the row the disc lands on (top row first): a disc into an empty column
 * (the bottom row) is the highest, each on a fuller column a little lower, as the stack gets heavier. Ringed discs sit
 * a little under plain ones, so you can tell yours from the other's without looking. Not tuned to notes: plastic isn't.
 */
const ROW_PITCH = { top: 0.88, perRow: 0.04 } as const;
const RINGED_PITCH = 0.92;

/** A hard plastic disc on plastic (owner pick, out of four by ear): a dry click with a short, unpitched plastic body under it. */
function clack(mix: Mix, pitch: number): Float32Array {
  const click = envelope(mix, bandpass(noise(mix, 0.01), mix.sampleRate, 3_200, 0.8), strike(0.0002, 0.0018));
  const body = ring(mix, [
    { hz: 1_150 * pitch, amp: 1, decay: 0.016, attack: 0.0002 },
    { hz: 1_690 * pitch, amp: 0.7, decay: 0.011 },
    { hz: 2_410 * pitch, amp: 0.4, decay: 0.007 },
    { hz: 330 * pitch, amp: 0.45, decay: 0.022 },
  ]);
  return layer(mix, [
    [0, body, 0.8],
    [0, click, 0.5],
  ]);
}

/** A disc dropping: its clack on the moment it lands (the board's own fall time), then two smaller ones as its bounce lands again. */
function discLands(pitchScale: number, which: string): SoundDefinition {
  return {
    about: `A ${which} disc drops: a dry plastic clack on the moment it lands, then two smaller ones as it bounces. Take = the row it lands on (top first): an empty column's is the highest, a fuller one's lower.`,
    level: "event",
    room: 0.1,
    variants: FOURINAROW_CONFIG.rows,
    render(mix, row) {
      const pitch = (ROW_PITCH.top + ROW_PITCH.perRow * row) * pitchScale;
      const lands = fallMs(row) / 1000;
      const [again, last] = DISC_BOUNCE.landsAt.map((share) => lands + (share * durations.discBounce) / 1000);
      mix.add(clack(mix, pitch), { at: lands });
      mix.add(clack(mix, pitch), { at: again, gain: 0.4 });
      mix.add(clack(mix, pitch), { at: last, gain: 0.15 });
    },
  };
}

/** A plastic disc dropped into the board: its clack lands with the disc. */
export const FOURINAROW_SOUNDS = defineSounds({
  fourInARowDiscLands: discLands(1, "plain"),
  fourInARowRingedDiscLands: discLands(RINGED_PITCH, "ringed"),
});

export type FourInARowDiscSound = keyof typeof FOURINAROW_SOUNDS;

/** The sound of the disc just dropped, as `viewer` sees it (ringed or plain), and its take (the row it landed on). */
export function lastDiscSound(game: FourInARowState, viewer: Seat | null): { sound: FourInARowDiscSound; variant: number } | null {
  if (game.lastMove === null) return null;
  const seat = game.cells[game.lastMove];
  if (seat === null || seat === undefined) return null;
  return { sound: isRinged(seat, viewer) ? "fourInARowRingedDiscLands" : "fourInARowDiscLands", variant: rowOf(game.lastMove) };
}
