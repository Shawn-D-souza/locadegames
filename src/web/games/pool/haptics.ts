import { defineHaptics } from "../../haptics/definition";

/**
 * Pool in your hand: your own shot, your balls going in (whoever shot), your foul, going out. Every click and cushion
 * stays out of it (a break would buzz on and on).
 */
export const POOL_HAPTICS = defineHaptics({
  poolCueHeld: { about: "A long press took hold of your cue: pull it back now.", pulses: [{ at: 0, level: "selection" }] },
  poolStrike: { about: "Your cue strikes the cue ball.", pulses: [{ at: 0, level: "medium" }] },
  poolPotted: { about: "One of your balls went in.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }] },
  poolFoul: { about: "Your shot was a foul: the turn passes.", pulses: [{ at: 0, level: "light" }, { at: 80, level: "light" }] },
  poolOut: { about: "You sank the black too early: you're out.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  poolYourTurn: { about: "Your shot came round.", pulses: [{ at: 0, level: "light" }] },
});
