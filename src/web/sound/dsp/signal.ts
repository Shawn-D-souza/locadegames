/** Basic signal helpers. Sounds are plain arrays of samples (mono unless said otherwise); nothing here touches the browser. */

/** What every instrument needs: the sample rate and a seeded random source (the same sound renders the same every time). */
export interface Synth {
  readonly sampleRate: number;
  random(): number;
}

export const toSamples = (s: Synth, seconds: number) => Math.max(1, Math.ceil(seconds * s.sampleRate));

export const dbToGain = (db: number) => Math.pow(10, db / 20);
export const gainToDb = (gain: number) => 20 * Math.log10(Math.max(gain, 1e-9));

/** White noise, seeded. */
export function noise(s: Synth, seconds: number): Float32Array {
  const out = new Float32Array(toSamples(s, seconds));
  for (let i = 0; i < out.length; i++) out[i] = s.random() * 2 - 1;
  return out;
}

/** Adds `track` into `out` at sample `at` (what doesn't fit is dropped). */
export function addInto(out: Float32Array, track: Float32Array, at: number, gain = 1) {
  const end = Math.min(out.length, at + track.length);
  for (let i = Math.max(at, 0); i < end; i++) out[i]! += track[i - at]! * gain;
}

/** Mixes tracks placed in time ([seconds, track, gain]) into one new track. */
export function layer(s: Synth, parts: readonly (readonly [at: number, track: Float32Array, gain?: number])[]): Float32Array {
  const length = Math.max(...parts.map(([at, track]) => toSamples(s, at) + track.length));
  const out = new Float32Array(length);
  for (const [at, track, gain] of parts) addInto(out, track, toSamples(s, at), gain ?? 1);
  return out;
}

/** Shapes a track in place: `shape` gets time in seconds and returns the gain there. */
export function envelope(s: Synth, track: Float32Array, shape: (seconds: number) => number): Float32Array {
  for (let i = 0; i < track.length; i++) track[i]! *= shape(i / s.sampleRate);
  return track;
}

/** Soft saturation in place: adds the harmonics that let low sounds carry on small phone speakers. */
export function saturate(track: Float32Array, drive: number): Float32Array {
  const norm = 1 / Math.tanh(drive);
  for (let i = 0; i < track.length; i++) track[i] = Math.tanh(track[i]! * drive) * norm;
  return track;
}

/** Quick rise, exponential fall: the envelope of nearly everything struck. */
export const strike = (attack: number, decay: number) => (t: number) => Math.min(1, t / attack) * Math.exp(-Math.max(0, t - attack) / decay);

/** Smooth 0 → 1. */
export const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
