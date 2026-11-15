import { defineHaptics } from "../../haptics/definition";

/** Your line is felt as your finger lands, a box you win lands firmer, and the turn coming round is a nudge. Others' lines and boxes aren't felt. */
export const DOTSBOXES_HAPTICS = defineHaptics({
  dotsBoxesTap: { about: "You draw a line.", pulses: [{ at: 0, level: "light" }] },
  dotsBoxesYourBox: { about: "You win a box: draw again.", pulses: [{ at: 0, level: "medium" }] },
  dotsBoxesYourTurn: { about: "The turn came round to you.", pulses: [{ at: 0, level: "light" }] },
});
