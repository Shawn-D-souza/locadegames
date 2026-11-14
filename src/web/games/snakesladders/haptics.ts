import { defineHaptics } from "../../haptics/definition";

/**
 * Your own roll in your hand (the die landing and a 6 are the shared die's, `dice/haptics.ts`): a ladder's climb, a snake's drop, getting home. Others' rolls and
 * every hop stay out of it (never constant).
 */
export const SNAKESLADDERS_HAPTICS = defineHaptics({
  snakesLaddersLadder: { about: "Your piece climbs a ladder.", pulses: [{ at: 0, level: "light" }, { at: 160, level: "medium" }] },
  snakesLaddersSnake: { about: "Your piece slides down a snake: a hit, then it fades.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  snakesLaddersThreeSixes: { about: "Your third 6 in a row: back where your turn began.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  snakesLaddersHome: { about: "Your piece reaches the last square.", pulses: [{ at: 0, level: "light" }, { at: 80, level: "medium" }, { at: 160, level: "heavy" }] },
  snakesLaddersYourTurn: { about: "Your roll came round.", pulses: [{ at: 0, level: "light" }] },
});
