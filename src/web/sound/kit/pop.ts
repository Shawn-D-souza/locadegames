import { ring } from "../dsp/modes";
import { addInto, type Synth } from "../dsp/signal";
import { hz as noteHz, type ScaleNote } from "../pitch";
import { contact } from "./tuned";

export interface PopOptions {
  note: ScaleNote;
  /** Where it starts relative to `hz`: under 1 springs up (arriving), over 1 falls (going away). */
  from?: number;
  /** Seconds to get there (a time constant): the spring of the animation it goes with. */
  glide?: number;
  decay?: number;
}

/**
 * Something new springing into place: a popup, a player's bar. The pitch moves with the spring in the animation,
 * small and fast. Never a long slide (a long falling slide is what a laser sounds like).
 */
export function pop(s: Synth, { note, from = 0.66, glide = 0.014, decay = 0.04 }: PopOptions): Float32Array {
  const hz = noteHz(note);
  const out = ring(s, [
    { hz, amp: 1, decay, from, glide, attack: 0.0012 },
    { hz: hz * 2.76, amp: 0.14, decay: decay * 0.4, from, glide: glide * 0.8 },
    { hz: 830, amp: 0.1, decay: 0.01 },
  ]);
  addInto(out, contact(s, 0.0014, 3_000), 0, 0.14);
  return out;
}
