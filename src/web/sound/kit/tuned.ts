import { bandpass } from "../dsp/filters";
import { ring } from "../dsp/modes";
import { addInto, envelope, noise, smooth, strike, type Synth } from "../dsp/signal";
import { hz, type ScaleNote } from "../pitch";

/** The tuned instruments: everything with a note in it is one of these, so all the app's melodies come from one toy box. */

export interface NoteOptions {
  note: ScaleNote;
  /** Seconds the note's body rings (a time constant). */
  ring?: number;
  /** 0 soft felt … 1 hard stick: harder is brighter, with more contact in the attack. */
  hardness?: number;
}

/** A felt mallet on a wooden bar in a wooden case: the app's main voice. */
export function mallet(s: Synth, { note, ring: seconds = 0.22, hardness = 0.5 }: NoteOptions): Float32Array {
  const f = hz(note);
  const attack = 0.0007 + (1 - hardness) * 0.0028;
  const out = ring(s, [
    // A struck bar starts a touch sharp and settles: much of what makes it a strike and not a beep.
    { hz: f, amp: 1, decay: seconds, attack, from: 1 + 0.008 + hardness * 0.012, glide: 0.006 },
    // A bar is never quite one pitch: a second, slightly sharp mode makes it breathe.
    { hz: f * 1.0041, amp: 0.2, decay: seconds * 0.7, attack },
    { hz: f * 2, amp: 0.06 + 0.06 * hardness, decay: seconds * 0.45, attack },
    // A tuned bar's overtones: about 4× and 9.2× its note, gone quickly.
    { hz: f * 3.93, amp: 0.1 + 0.3 * hardness, decay: seconds * 0.2, attack: attack * 0.6 },
    { hz: f * 9.16, amp: 0.015 + 0.09 * hardness * hardness, decay: seconds * 0.07, attack: attack * 0.4 },
    // The case: the same whatever the note, which is what makes them one instrument.
    { hz: 830, amp: 0.1 + 0.12 * hardness, decay: 0.012 },
    { hz: 1_730, amp: 0.05 + 0.1 * hardness, decay: 0.007 },
  ]);
  addInto(out, contact(s, 0.0025, 2_600 + hardness * 2_400), 0, 0.1 + 0.3 * hardness);
  return out;
}

/** A small metal tine, like a music box or kalimba: for sparkle and for gentle signals. Never the main voice. */
export function tine(s: Synth, { note, ring: seconds = 0.16, hardness = 0.5 }: NoteOptions): Float32Array {
  const f = hz(note);
  const out = ring(s, [
    { hz: f, amp: 1, decay: seconds, attack: 0.0009 },
    { hz: f * 1.0022, amp: 0.25, decay: seconds * 0.75, attack: 0.0009 },
    { hz: f * 2.01, amp: 0.1, decay: seconds * 0.4 },
    { hz: f * 5.43, amp: 0.05 + 0.13 * hardness, decay: seconds * 0.09 },
  ]);
  addInto(out, contact(s, 0.0012, 4_800), 0, 0.05 + 0.12 * hardness);
  return out;
}

/** The tiny noisy touch at the start of a strike. */
export function contact(s: Synth, seconds: number, centerHz: number): Float32Array {
  return envelope(s, bandpass(noise(s, seconds * 3), s.sampleRate, centerHz, 0.9), strike(seconds * 0.15, seconds * 0.6));
}

export interface ReedOptions {
  notes: readonly ScaleNote[];
  seconds: number;
  attack: number;
  release: number;
}

const REED_HARMONICS = [1, 0.42, 0.2, 0.09, 0.04] as const;
/** The waver changes the pitch this often (samples): slow enough not to compute it every sample. */
const WAVER_BLOCK = 64;

/**
 * A soft reed chord, swelling and fading under a big moment, like a melodica breathed into. It fills out the
 * mallets' quick notes; on its own it stays well back. Each note has a slow waver of its own.
 */
export function reed(s: Synth, { notes, seconds, attack, release }: ReedOptions): Float32Array {
  const out = new Float32Array(Math.ceil((seconds + release) * s.sampleRate));
  for (const note of notes) {
    const f = hz(note);
    const waverHz = 3.4 + s.random() * 1.2;
    const waverPhase = s.random() * Math.PI * 2;
    REED_HARMONICS.forEach((amp, h) => {
      const partial = f * (h + 1);
      if (partial > s.sampleRate * 0.4) return;
      const start = s.random() * Math.PI * 2;
      let re = Math.cos(start) * amp;
      let im = Math.sin(start) * amp;
      let cos = 1;
      let sin = 0;
      for (let i = 0; i < out.length; i++) {
        if (i % WAVER_BLOCK === 0) {
          const waver = 1 + 0.0016 * Math.sin(2 * Math.PI * waverHz * (i / s.sampleRate) + waverPhase);
          const turn = (2 * Math.PI * partial * waver) / s.sampleRate;
          cos = Math.cos(turn);
          sin = Math.sin(turn);
        }
        out[i]! += im;
        const next = re * cos - im * sin;
        im = re * sin + im * cos;
        re = next;
      }
    });
  }
  return envelope(s, out, (t) => {
    const fading = Math.max(0, 1 - Math.max(0, t - seconds) / release);
    return (smooth(t / attack) * fading * fading * fading) / notes.length;
  });
}
