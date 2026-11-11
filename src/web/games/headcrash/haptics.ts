import { defineHaptics } from "../../haptics/definition";

/**
 * What you feel in a match: your own car's weight (landings, knocks) lightly, and the round's one big moment hard.
 * Holding a button is quiet in the hand, so the hits stand out. A match you only watch is not felt.
 */
export const HEADCRASH_HAPTICS = defineHaptics({
  headCrashLanding: { about: "Your car lands on its wheels.", pulses: [{ at: 0, level: "light" }] },
  headCrashCarBump: { about: "The cars knock into each other.", pulses: [{ at: 0, level: "medium" }] },
  headCrashYouScored: { about: "Your point: a hard hit and its echo, with the burst.", pulses: [{ at: 0, level: "heavy" }, { at: 100, level: "medium" }] },
  headCrashYouWereHit: {
    about: "Your head is hit: two hard hits, then it falls away, with the shake.",
    pulses: [{ at: 0, level: "heavy" }, { at: 70, level: "heavy" }, { at: 200, level: "light" }],
  },
  headCrashBothHeadsHit: { about: "Both heads hit at once: one knock, nobody's point.", pulses: [{ at: 0, level: "medium" }] },
});
