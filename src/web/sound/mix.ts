import { seededRandom } from "../utils/seededRandom";
import { addInto, toSamples, type Synth } from "./dsp/signal";

export interface PlaceOptions {
  /** Seconds from the start of the sound. */
  at?: number;
  gain?: number;
  /** -1 left … 1 right. Only for details: phones play nearly mono, so nothing important sits to one side. */
  pan?: number;
}

/** A sound's mix while it's being made: instruments are rendered and placed in time, like notes in a score. */
export class Mix implements Synth {
  readonly random: () => number;
  private placed: { track: Float32Array; at: number; left: number; right: number }[] = [];

  constructor(
    readonly sampleRate: number,
    seed: number,
  ) {
    this.random = seededRandom(seed);
  }

  add(track: Float32Array, { at = 0, gain = 1, pan = 0 }: PlaceOptions = {}): this {
    // Equal power: a panned detail keeps its loudness.
    const angle = ((pan + 1) * Math.PI) / 4;
    // Zero really is zero: `toSamples` never gives less than 1, and a loop that repeats exactly would hear that sample.
    this.placed.push({ track, at: at > 0 ? toSamples(this, at) : 0, left: gain * Math.cos(angle) * Math.SQRT2, right: gain * Math.sin(angle) * Math.SQRT2 });
    return this;
  }

  /** A random value in [low, high). */
  between(low: number, high: number): number {
    return low + (high - low) * this.random();
  }

  /** The placed tracks mixed down, with `extraSeconds` of silence after them. */
  bounce(extraSeconds: number): [Float32Array, Float32Array] {
    const end = Math.max(1, ...this.placed.map((p) => p.at + p.track.length));
    const left = new Float32Array(end + toSamples(this, extraSeconds));
    const right = new Float32Array(left.length);
    for (const p of this.placed) {
      addInto(left, p.track, p.at, p.left);
      addInto(right, p.track, p.at, p.right);
    }
    return [left, right];
  }
}
