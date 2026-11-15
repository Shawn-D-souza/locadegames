import { defineHaptics } from "../../haptics/definition";

/**
 * Carrom in your hand: your own shot and what it scores. Every click and knock on the frame stays out of it (a break
 * would buzz on and on).
 */
export const CARROM_HAPTICS = defineHaptics({
  carromStrikerHeld: { about: "A long press took hold of your striker: pull it back now.", pulses: [{ at: 0, level: "selection" }] },
  carromFlick: { about: "You flicked the striker.", pulses: [{ at: 0, level: "medium" }] },
  carromScored: { about: "A coin went in on your shot: points for you.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }] },
  carromCovered: { about: "You covered the queen: her 50 points are yours.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }, { at: 200, level: "heavy" }] },
  carromQueenBack: { about: "Your queen went back in the middle: not covered.", pulses: [{ at: 0, level: "medium" }, { at: 180, level: "light" }] },
  carromFoul: { about: "Your striker went in: -10, and the turn passes.", pulses: [{ at: 0, level: "light" }, { at: 80, level: "light" }] },
  carromYourTurn: { about: "Your shot came round.", pulses: [{ at: 0, level: "light" }] },
});
