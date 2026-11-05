import { bandpass } from "../dsp/filters";
import { addInto, layer, noise, smooth, type Synth } from "../dsp/signal";
import { hz, type ScaleNote } from "../pitch";

/** The winner's voice, on purpose nothing like the app's mallets and wood: a win should stand out from everything else. */

const TAU = 2 * Math.PI;
/** Overtones stop here: higher only turns harsh on a phone. */
const TOP_HZ = 12_000;

const fadeOut = (t: number, seconds: number, release: number) => (t < seconds ? 1 : Math.max(0, 1 - (t - seconds) / release));

export interface TrumpetOptions {
  note: ScaleNote;
  seconds: number;
  release?: number;
  /** How much it grows as it's held, 0 steady … 1 a lot: a held note that grows ends on a high instead of settling. */
  swell?: number;
}

/**
 * A real player's trumpet, not just a buzzy tone: the lips scoop up into the note and overshoot it, it gets brighter
 * as it gets louder, a held note starts to shake after a moment, and it all comes out through a bell with breath in it.
 */
export function trumpet(s: Synth, { note, seconds, release = 0.08, swell = 0 }: TrumpetOptions): Float32Array {
  const f = hz(note);
  const count = Math.min(16, Math.floor(TOP_HZ / f));
  const out = new Float32Array(Math.ceil((seconds + release) * s.sampleRate));
  const level = (t: number) => smooth(t / 0.01) * (1 + 0.4 * Math.exp(-t / 0.045)) * (1 + swell * 0.5 * smooth(t / seconds)) * fadeOut(t, seconds, release);
  let phase = s.random() * TAU;
  for (let i = 0; i < out.length; i++) {
    const t = i / s.sampleRate;
    const vibrato = 0.006 * Math.sin(TAU * 5.6 * t) * smooth((t - 0.12) / 0.12);
    phase += (TAU * f * (1 - 0.04 * Math.exp(-t / 0.016)) * (1 + vibrato)) / s.sampleRate;
    const loud = level(t);
    const bright = 2 + 8 * Math.min(1, loud);
    let sum = 0;
    for (let h = 1; h <= count; h++) sum += (Math.sin(h * phase) / h) * Math.exp(-h / bright);
    out[i] = sum * loud;
  }
  const breath = bandpass(noise(s, seconds + release), s.sampleRate, 2_600, 0.8);
  for (let i = 0; i < breath.length; i++) {
    const t = i / s.sampleRate;
    breath[i]! *= level(t) * (0.035 + 0.1 * Math.exp(-t / 0.02));
  }
  const bell = layer(s, [
    [0, out, 0.55],
    [0, bandpass(out, s.sampleRate, 1_350, 0.9), 0.85],
    [0, bandpass(out, s.sampleRate, 2_900, 1.2), 0.35],
  ]);
  addInto(bell, breath, 0, 1);
  return bell;
}
