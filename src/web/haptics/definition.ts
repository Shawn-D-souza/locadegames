import type { Vibration } from "web-haptics";

/**
 * How hard a pulse feels. Browsers can't set a motor's strength, so `intensity` below 1 has web-haptics switch it on
 * and off quickly, which feels softer. The names match what `@capacitor/haptics` offers (a selection tick, then light,
 * medium and heavy impacts), so the Android app can use the real thing with the same book.
 */
export const HAPTIC_LEVELS = {
  /** The smallest thing that can still be felt: a crisp tick. Any shorter and some phones feel nothing. */
  selection: { duration: 10, intensity: 1 },
  light: { duration: 30, intensity: 0.5 },
  medium: { duration: 30, intensity: 0.8 },
  heavy: { duration: 40, intensity: 1 },
} as const;

export type HapticLevel = keyof typeof HAPTIC_LEVELS;

/** One push of the motor, `at` ms from the start of its pattern. */
export interface Pulse {
  at: number;
  level: HapticLevel;
}

export interface HapticDefinition {
  /** In plain words: which moment this is, as shown on the haptics preview page. */
  about: string;
  pulses: readonly Pulse[];
}

/** One feel placed in a whole moment, timed like the sound it goes with. */
export interface HapticStep<Name extends string = string> {
  haptic: Name;
  at: number;
}

/** Keeps each entry's own name in the type, so a wrong name is a compile error. */
export const defineHaptics = <Name extends string>(haptics: Record<Name, HapticDefinition>) => haptics;

/** When a pulse has finished. */
export const pulseEnd = (pulse: Pulse) => pulse.at + HAPTIC_LEVELS[pulse.level].duration;

/** Pulses in time order, as web-haptics wants them: each with the pause before it. */
export function toVibrations(pulses: readonly Pulse[]): Vibration[] {
  let freeAt = 0;
  return pulses.map((pulse) => {
    const delay = pulse.at - freeAt;
    freeAt = pulseEnd(pulse);
    return { ...HAPTIC_LEVELS[pulse.level], ...(delay > 0 && { delay }) };
  });
}
