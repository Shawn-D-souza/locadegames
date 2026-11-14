import { defineHaptics } from "../../haptics/definition";

/** The shared die in your hand (Snakes & Ladders, Ludo): only your own roll. */
export const DICE_HAPTICS = defineHaptics({
  dieLands: { about: "Your die lands.", pulses: [{ at: 0, level: "medium" }] },
  dieSix: { about: "Your die shows a 6: roll again.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "light" }] },
});
