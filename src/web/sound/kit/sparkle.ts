import type { Mix } from "../mix";
import type { ScaleNote } from "../pitch";
import { tine } from "./tuned";

export interface SparkleOptions {
  /** Picked from in order, wrapping: rising lists sparkle upward. */
  notes: readonly ScaleNote[];
  count: number;
  /** Seconds: when the first and the last start. */
  from: number;
  to: number;
  gain?: number;
  /** How far apart they spread left and right (headphones). */
  width?: number;
}

/** A shower of tiny tines, spread in time and space: a ring of stars bursting, sparks flying. */
export function addSparkle(mix: Mix, { notes, count, from, to, gain = 0.3, width = 0.7 }: SparkleOptions) {
  for (let i = 0; i < count; i++) {
    const at = from + (to - from) * Math.pow((i + mix.random() * 0.6) / count, 1.25);
    const note = notes[i % notes.length]!;
    const fall = 1 - (0.55 * i) / count;
    mix.add(tine(mix, { note, ring: mix.between(0.07, 0.14), hardness: 0.6 }), { at, gain: gain * fall * mix.between(0.65, 1), pan: mix.between(-width, width) });
  }
}
