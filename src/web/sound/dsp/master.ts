import { highpass, highShelf, lowpass } from "./filters";
import { dbToGain, gainToDb } from "./signal";

/**
 * Finishing every sound the same way, so they sit together and hold up on a phone: the same low cut and top
 * softening, then a level set by how loud it is **through a phone speaker** (which plays almost nothing under
 * 300 Hz) and heard by an ear, so a new sound lands at the right loudness just by naming its level.
 */

const LOW_CUT_HZ = 110;
const AIR_SHELF_HZ = 8_500;
const AIR_SHELF_DB = -4;
const PHONE_LOW_HZ = 300;
const PHONE_HIGH_HZ = 8_000;
/** Ears are more sensitive up here: at the same level, a bright swish sounds louder than a low note. */
const EAR_SHELF_HZ = 1_500;
const EAR_SHELF_DB = 5;
const LOUDNESS_WINDOW_SECONDS = 0.05;
/** Nothing goes over this; peaks above the knee are rounded off, not clipped. */
const PEAK_LIMIT = 0.89;
const KNEE = 0.6;
/** The tail is cut when it falls this far below the sound's peak… */
const TAIL_FLOOR_DB = -56;
/** …with this last fade, so it never ends in a click. */
const TAIL_FADE_SECONDS = 0.012;

export const mono = (left: Float32Array, right: Float32Array) => {
  const out = new Float32Array(left.length);
  for (let i = 0; i < out.length; i++) out[i] = (left[i]! + right[i]!) / 2;
  return out;
};

/** A track as a phone speaker plays it and an ear takes it in (roughly). */
export function throughPhone(track: Float32Array, sampleRate: number): Float32Array {
  const speaker = lowpass(highpass(highpass(track, sampleRate, PHONE_LOW_HZ), sampleRate, PHONE_LOW_HZ), sampleRate, PHONE_HIGH_HZ);
  return highShelf(speaker, sampleRate, EAR_SHELF_HZ, EAR_SHELF_DB);
}

/** The loudest 50 ms, in dB of RMS. */
export function loudestWindowDb(track: Float32Array, sampleRate: number): number {
  const window = Math.max(1, Math.round(LOUDNESS_WINDOW_SECONDS * sampleRate));
  let sum = 0;
  let most = 0;
  for (let i = 0; i < track.length; i++) {
    sum += track[i]! * track[i]!;
    if (i >= window) sum -= track[i - window]! * track[i - window]!;
    if (sum > most) most = sum;
  }
  return gainToDb(Math.sqrt(most / window));
}

/** How loud a sound is on a phone: the number levels are set by (and tests check). */
export const phoneLoudnessDb = (left: Float32Array, right: Float32Array, sampleRate: number) =>
  loudestWindowDb(throughPhone(mono(left, right), sampleRate), sampleRate);

function roundPeaks(track: Float32Array) {
  for (let i = 0; i < track.length; i++) {
    const x = Math.abs(track[i]!);
    if (x <= KNEE) continue;
    const over = (x - KNEE) / (PEAK_LIMIT - KNEE);
    track[i] = Math.sign(track[i]!) * (KNEE + (PEAK_LIMIT - KNEE) * Math.tanh(over));
  }
}

function cutTail(left: Float32Array, right: Float32Array, sampleRate: number): [Float32Array, Float32Array] {
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  const floor = peak * dbToGain(TAIL_FLOOR_DB);
  let end = left.length;
  while (end > 1 && Math.abs(left[end - 1]!) < floor && Math.abs(right[end - 1]!) < floor) end -= 1;
  const fade = Math.min(end, Math.round(TAIL_FADE_SECONDS * sampleRate));
  const l = left.slice(0, end);
  const r = right.slice(0, end);
  for (let i = 0; i < fade; i++) {
    const gain = i / fade;
    l[end - 1 - i]! *= gain;
    r[end - 1 - i]! *= gain;
  }
  return [l, r];
}

function tone(track: Float32Array, sampleRate: number) {
  return highShelf(highpass(track, sampleRate, LOW_CUT_HZ), sampleRate, AIR_SHELF_HZ, AIR_SHELF_DB);
}

/** Shared tone and level (no room, no tail cut, for loops). */
export function finishLoop(left: Float32Array, right: Float32Array, sampleRate: number, targetDb: number): [Float32Array, Float32Array] {
  const l = tone(left, sampleRate);
  const r = tone(right, sampleRate);
  const gain = dbToGain(targetDb - phoneLoudnessDb(l, r, sampleRate));
  for (let i = 0; i < l.length; i++) {
    l[i]! *= gain;
    r[i]! *= gain;
  }
  return [l, r];
}

/** Shared tone, the level, rounded peaks and a clean end. */
export function finishSound(left: Float32Array, right: Float32Array, sampleRate: number, targetDb: number): [Float32Array, Float32Array] {
  const [l, r] = finishLoop(left, right, sampleRate, targetDb);
  roundPeaks(l);
  roundPeaks(r);
  return cutTail(l, r, sampleRate);
}
