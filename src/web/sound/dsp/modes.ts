import { toSamples, type Synth } from "./signal";

/**
 * Modal synthesis: a struck object rings as a set of damped sine waves ("modes"), each with its own pitch,
 * level and decay, the higher ones dying first. It is what makes a sound read as wood or glass rather than
 * as an oscillator. Real objects' modes are not whole multiples of the lowest one.
 */
export interface Mode {
  hz: number;
  amp: number;
  /** Seconds to fall to about 37% (a time constant). */
  decay: number;
  /** Seconds to rise: a soft felt mallet takes longer to touch than a hard stick. */
  attack?: number;
  /** Starts at this share of `hz` and springs there (a pop). */
  from?: number;
  /** Time constant of that move, in seconds. */
  glide?: number;
}

/** Decays this many time constants: about -56 dB, where the end of a sound gets cut anyway. */
const RING_OUT = 6.5;
const TWO_PI = 2 * Math.PI;
/** A glide has settled after this many of its time constants. */
const GLIDE_SETTLES = 6;

/**
 * Adds one mode. It turns a point around a circle with a multiplication per sample instead of calling sin:
 * sounds are made on phones, and this is the loop nearly all the time goes to. A glide does the moving part
 * the slow way and hands over.
 */
function addMode(out: Float32Array, m: Mode, sampleRate: number) {
  const end = Math.min(out.length, Math.ceil(m.decay * RING_OUT * sampleRate));
  const fall = Math.exp(-1 / (m.decay * sampleRate));
  const rise = m.attack ? Math.exp(-1 / (m.attack * sampleRate)) : 0;
  let amp = m.amp;
  let unrisen = m.attack ? 1 : 0;
  let phase = 0;
  let start = 0;
  if (m.from !== undefined && m.from !== 1) {
    const glide = m.glide ?? 0.02;
    start = Math.min(end, Math.ceil(glide * GLIDE_SETTLES * sampleRate));
    const settle = Math.exp(-1 / (glide * sampleRate));
    let off = m.from - 1;
    for (let i = 0; i < start; i++) {
      phase += (TWO_PI * m.hz * (1 + off)) / sampleRate;
      out[i]! += Math.sin(phase) * amp * (1 - unrisen);
      off *= settle;
      amp *= fall;
      unrisen *= rise;
    }
  }
  const turn = (TWO_PI * m.hz) / sampleRate;
  const cos = Math.cos(turn) * fall;
  const sin = Math.sin(turn) * fall;
  let re = Math.cos(phase) * amp;
  let im = Math.sin(phase) * amp;
  if (rise === 0) {
    for (let i = start; i < end; i++) {
      out[i]! += im;
      const next = re * cos - im * sin;
      im = re * sin + im * cos;
      re = next;
    }
    return;
  }
  for (let i = start; i < end; i++) {
    out[i]! += im * (1 - unrisen);
    const next = re * cos - im * sin;
    im = re * sin + im * cos;
    re = next;
    unrisen *= rise;
  }
}

/** Rings a set of modes; the track lasts until the slowest has died out. */
export function ring(s: Synth, modes: readonly Mode[]): Float32Array {
  const seconds = Math.max(...modes.map((m) => m.decay * RING_OUT + (m.attack ?? 0)));
  const out = new Float32Array(toSamples(s, seconds));
  for (const m of modes) if (m.hz < s.sampleRate * 0.45) addMode(out, m, s.sampleRate);
  return out;
}
