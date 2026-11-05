import { bandpass } from "../dsp/filters";
import { ring, type Mode } from "../dsp/modes";
import { addInto, envelope, layer, noise, saturate, strike, type Synth } from "../dsp/signal";
import { hz, type ScaleNote } from "../pitch";
import { contact, mallet } from "./tuned";

/** Wood and card being touched, pressed and dropped: the app's untuned sounds. */

export interface TapOptions {
  hz: number;
  /** Seconds the lowest mode rings. */
  decay?: number;
  /** 0 soft … 1 hard. */
  hardness?: number;
}

/** Modes of a small block of wood: close together and quickly damped. */
const WOOD_BLOCK = [
  { ratio: 1, amp: 1, decay: 1 },
  { ratio: 1.58, amp: 0.55, decay: 0.72 },
  { ratio: 2.24, amp: 0.34, decay: 0.5 },
  { ratio: 3.17, amp: 0.2, decay: 0.34 },
  { ratio: 4.73, amp: 0.1, decay: 0.2 },
] as const;

/** A fingertip or a peg on a small block of wood. */
export function woodTap(s: Synth, { hz, decay = 0.022, hardness = 0.5 }: TapOptions): Float32Array {
  const modes: Mode[] = WOOD_BLOCK.map((m, i) => ({
    hz: hz * m.ratio,
    amp: m.amp * (i === 0 ? 1 : 0.5 + hardness * 0.7),
    decay: decay * m.decay,
    attack: 0.0003 + (1 - hardness) * 0.0009,
  }));
  const out = ring(s, modes);
  addInto(out, contact(s, 0.0016, 2_000 + hardness * 3_000), 0, 0.12 + hardness * 0.4);
  return out;
}

export interface PressOptions {
  /** The button's note: every press is in the app's scale, on the same mallets as everything else. */
  note: ScaleNote;
  /** How much button there is: small icon tiles are light, the big ones sit down heavily. */
  weight?: number;
}

/** A button squashing down onto its lip: a short felt note, then a soft wooden seat a fourth under it as it bottoms out. */
export function lipPress(s: Synth, { note, weight = 1 }: PressOptions): Float32Array {
  return layer(s, [
    [0, mallet(s, { note, ring: 0.03 + weight * 0.035, hardness: 0.35 })],
    [0.024 + weight * 0.008, woodTap(s, { hz: hz(note) * 0.75, decay: 0.012 + weight * 0.008, hardness: 0.15 }), 0.14 + weight * 0.1],
  ]);
}

export interface ThumpOptions {
  /** Where the low note ends up. Under a phone speaker's range, so its overtones and box do the work there. */
  hz?: number;
  /** Starts this many times higher and falls fast: the punch. */
  drop?: number;
  decay?: number;
  /** Saturation: adds the overtones that carry on a phone. */
  drive?: number;
  /** The hollow box it hits. */
  box?: number;
}

/** Something heavy-ish landing on a table. */
export function thump(s: Synth, { hz = 105, drop = 1.7, decay = 0.085, drive = 1.8, box = 310 }: ThumpOptions = {}): Float32Array {
  const out = saturate(
    ring(s, [
      { hz, amp: 0.5, decay, from: drop, glide: 0.018, attack: 0.0006 },
      { hz: hz * 2.02, amp: 0.3, decay: decay * 0.6, from: drop, glide: 0.014 },
      // The box: this, not the low note, is what a phone speaker plays.
      { hz: box, amp: 0.85, decay: Math.max(0.03, decay * 0.5) },
      { hz: box * 1.71, amp: 0.6, decay: Math.max(0.022, decay * 0.32) },
      { hz: box * 2.63, amp: 0.34, decay: 0.014 },
      { hz: box * 4.1, amp: 0.14, decay: 0.008 },
    ]),
    drive,
  );
  addInto(out, contact(s, 0.0024, 2_400), 0, 0.3);
  return out;
}

/** A rubber stamp on paper: a thump with a crisp paper crack on top. What results and land hit with. */
export function stamp(s: Synth, { weight = 1 }: { weight?: number } = {}): Float32Array {
  const crack = envelope(s, bandpass(noise(s, 0.03), s.sampleRate, 3_100, 0.7), strike(0.0004, 0.0055));
  return layer(s, [
    [0, thump(s, { hz: 118 + (1 - weight) * 50, decay: 0.05 + weight * 0.05, box: 340 }), 0.7 + weight * 0.3],
    [0, woodTap(s, { hz: 610, decay: 0.03, hardness: 0.75 }), 0.55],
    [0, crack, 0.55],
  ]);
}

export interface ScatterOptions {
  pieces: number;
  seconds: number;
  /** Pieces' pitch: picked between these. */
  lowHz: number;
  highHz: number;
  /** Each piece is this much of the one before it. */
  fade?: number;
}

/** Small wooden pieces bouncing away: a head bursting apart, land crumbling. Close together at first, then thinning out. */
export function scatter(s: Synth, { pieces, seconds, lowHz, highHz, fade = 0.86 }: ScatterOptions): Float32Array {
  const parts: [number, Float32Array, number][] = [];
  let gain = 1;
  for (let i = 0; i < pieces; i++) {
    const at = seconds * Math.pow((i + s.random() * 0.7) / pieces, 1.7);
    const hz = lowHz * Math.pow(highHz / lowHz, s.random());
    parts.push([at, woodTap(s, { hz, decay: 0.006 + s.random() * 0.012, hardness: 0.4 + s.random() * 0.4 }), gain * (0.7 + s.random() * 0.3)]);
    gain *= fade;
  }
  return layer(s, parts);
}
