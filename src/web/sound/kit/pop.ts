import { ring } from "../dsp/modes";
import { bandpass } from "../dsp/filters";
import { addInto, envelope, noise, strike, type Synth } from "../dsp/signal";
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

export interface BubbleOptions {
  note: ScaleNote;
  /** Bigger bubbles ring longer and have more weight under them. */
  size?: number;
}

/**
 * A bubble bursting: a round body springing up into its note (a bubble's pitch rises as it closes), a soft weight an
 * octave under it and a tiny snap on top. Juicy, not clicky: no wooden rattle, nothing hissy.
 */
export function bubble(s: Synth, { note, size = 1 }: BubbleOptions): Float32Array {
  const hz = noteHz(note);
  const out = ring(s, [
    { hz, amp: 1, decay: 0.06 + 0.03 * size, from: 0.5, glide: 0.016, attack: 0.002 },
    { hz: hz * 2, amp: 0.22, decay: 0.035, from: 0.5, glide: 0.014, attack: 0.002 },
    { hz: hz / 2, amp: 0.35 * size, decay: 0.03 + 0.02 * size, from: 0.7, glide: 0.02, attack: 0.003 },
  ]);
  const snap = envelope(s, bandpass(noise(s, 0.012), s.sampleRate, 2_600, 1.2), strike(0.0003, 0.0025));
  addInto(out, snap, 0, 0.35);
  return out;
}
