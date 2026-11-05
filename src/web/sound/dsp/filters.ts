/** Filters, as new tracks. Fixed filters are biquads (RBJ cookbook); moving ones a state-variable filter. */

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function runBiquad(x: Float32Array, c: Biquad): Float32Array {
  const out = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function coefficients(hz: number, q: number, sampleRate: number) {
  const w = (2 * Math.PI * Math.min(hz, sampleRate * 0.45)) / sampleRate;
  return { cos: Math.cos(w), alpha: Math.sin(w) / (2 * q) };
}

export function lowpass(x: Float32Array, sampleRate: number, hz: number, q = Math.SQRT1_2): Float32Array {
  const { cos, alpha } = coefficients(hz, q, sampleRate);
  const a0 = 1 + alpha;
  return runBiquad(x, { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 });
}

export function highpass(x: Float32Array, sampleRate: number, hz: number, q = Math.SQRT1_2): Float32Array {
  const { cos, alpha } = coefficients(hz, q, sampleRate);
  const a0 = 1 + alpha;
  return runBiquad(x, { b0: (1 + cos) / 2 / a0, b1: -(1 + cos) / a0, b2: (1 + cos) / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 });
}

export function bandpass(x: Float32Array, sampleRate: number, hz: number, q = 1): Float32Array {
  const { cos, alpha } = coefficients(hz, q, sampleRate);
  const a0 = 1 + alpha;
  return runBiquad(x, { b0: alpha / a0, b1: 0, b2: -alpha / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 });
}

/** Gain above `hz` (a gentle shelf, slope 1). */
export function highShelf(x: Float32Array, sampleRate: number, hz: number, db: number): Float32Array {
  const A = Math.pow(10, db / 40);
  const w = (2 * Math.PI * Math.min(hz, sampleRate * 0.45)) / sampleRate;
  const cos = Math.cos(w);
  const alpha = (Math.sin(w) / 2) * Math.SQRT2;
  const root = 2 * Math.sqrt(A) * alpha;
  const a0 = A + 1 - (A - 1) * cos + root;
  return runBiquad(x, {
    b0: (A * (A + 1 + (A - 1) * cos + root)) / a0,
    b1: (-2 * A * (A - 1 + (A + 1) * cos)) / a0,
    b2: (A * (A + 1 + (A - 1) * cos - root)) / a0,
    a1: (2 * (A - 1 - (A + 1) * cos)) / a0,
    a2: (A + 1 - (A - 1) * cos - root) / a0,
  });
}

export type SweepMode = "low" | "band" | "high";

/** How often a moving filter recomputes its cutoff, in samples. */
const SWEEP_UPDATE = 16;

/** A filter whose cutoff moves: `cutoff` gets the position 0 → 1 through the track and returns Hz. */
export function sweep(x: Float32Array, sampleRate: number, mode: SweepMode, cutoff: (position: number) => number, q = 1): Float32Array {
  const out = new Float32Array(x.length);
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % SWEEP_UPDATE === 0) {
      const g = Math.tan((Math.PI * Math.min(cutoff(i / x.length), sampleRate * 0.45)) / sampleRate);
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    }
    const v3 = x[i]! - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === "low" ? v2 : mode === "band" ? v1 * k : x[i]! - k * v1 - v2;
  }
  return out;
}
