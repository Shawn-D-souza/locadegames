import { bandpass, lowpass, sweep } from "../dsp/filters";
import { addInto, envelope, noise, smooth, strike, type Synth } from "../dsp/signal";

/** Paper, card and pen: the notebook half of "arcade notebook". Noise shaped until it stops sounding like noise. */

export interface SwishOptions {
  seconds: number;
  fromHz: number;
  toHz: number;
  /** How wide the band is: higher is narrower and more whistly, so it stays low. */
  q?: number;
  /** Position 0 → 1 of the loudest moment. */
  peak?: number;
  /** Fibre: how much of the paper's grain to hear (0 smooth air … 1 scratchy). */
  grain?: number;
  /** How the pitch moves over the sound's length (0 → 1), e.g. fast then slow. */
  curve?: (position: number) => number;
}

/** Slow random flutter, 0…1: what makes moving paper sound uneven. */
function grainTrack(s: Synth, length: number, ratePerSecond: number): Float32Array {
  const out = new Float32Array(length);
  const step = Math.max(2, Math.round(s.sampleRate / ratePerSecond));
  let from = s.random();
  let to = s.random();
  for (let i = 0; i < length; i++) {
    if (i % step === 0) {
      from = to;
      to = s.random();
    }
    out[i] = from + (to - from) * smooth((i % step) / step);
  }
  return out;
}

/** A hand, a sleeve or a sheet moving through the air: moving-band noise with some paper grain in it. */
export function swish(s: Synth, { seconds, fromHz, toHz, q = 1.1, peak = 0.35, grain = 0.3, curve = (p) => p }: SwishOptions): Float32Array {
  const raw = noise(s, seconds);
  const flutter = grainTrack(s, raw.length, 220);
  for (let i = 0; i < raw.length; i++) raw[i]! *= 1 - grain + grain * 2 * flutter[i]! * flutter[i]!;
  const ratio = toHz / fromHz;
  const shaped = sweep(raw, s.sampleRate, "band", (p) => fromHz * Math.pow(ratio, curve(p)), q);
  return envelope(s, shaped, (t) => {
    const p = t / seconds;
    if (p < peak) return smooth(p / peak);
    return Math.pow(1 - (p - peak) / (1 - peak), 2.2);
  });
}

/** A felt marker drawing across paper, without end: the trail. Soft, with a slow unevenness, so it never reads as hiss. */
export function markerStroke(s: Synth, seconds: number): Float32Array {
  const raw = noise(s, seconds);
  const hand = grainTrack(s, raw.length, 7);
  const fibre = grainTrack(s, raw.length, 95);
  for (let i = 0; i < raw.length; i++) raw[i]! *= (0.62 + 0.38 * hand[i]!) * (0.7 + 0.6 * fibre[i]!);
  const under = bandpass(raw, s.sampleRate, 640, 0.9);
  const body = bandpass(raw, s.sampleRate, 1_150, 0.75);
  const nib = bandpass(raw, s.sampleRate, 2_500, 1.3);
  // The felt's faint squeak, wandering with the hand: what makes it a pen and not air.
  const squeak = sweep(raw, s.sampleRate, "band", (p) => 1_700 + 260 * Math.sin(p * Math.PI * 6), 9);
  const out = new Float32Array(raw.length);
  addInto(out, under, 0, 0.7);
  addInto(out, body, 0, 1);
  addInto(out, nib, 0, 0.28);
  addInto(out, squeak, 0, 0.9);
  return lowpass(out, s.sampleRate, 4_200);
}

/** A soft bit of paper touching down. */
export function paperTick(s: Synth, { hz = 2_800, decay = 0.006 }: { hz?: number; decay?: number } = {}): Float32Array {
  return envelope(s, bandpass(noise(s, decay * 6), s.sampleRate, hz, 0.8), strike(0.0006, decay));
}
