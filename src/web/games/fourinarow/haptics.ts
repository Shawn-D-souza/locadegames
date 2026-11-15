import { defineHaptics } from "../../haptics/definition";

/**
 * Aiming ticks like a picker, letting go is a tick, and the landing is the weight: firm for your disc, light for the
 * other's (your turn). The landings are played by the board on the fall's own time, so they land with the clack.
 */
export const FOURINAROW_HAPTICS = defineHaptics({
  fourInARowAimMoved: { about: "Sliding along the board: your disc moves over the next column.", pulses: [{ at: 0, level: "selection" }] },
  fourInARowDiscDropped: { about: "You let go: your disc drops.", pulses: [{ at: 0, level: "selection" }] },
  fourInARowYourDiscLanded: { about: "Your disc lands in its hole, with its clack.", pulses: [{ at: 0, level: "medium" }] },
  fourInARowOpponentLanded: { about: "The other player's disc landed: your turn.", pulses: [{ at: 0, level: "light" }] },
});
