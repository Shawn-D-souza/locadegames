import { defineHaptics } from "../../haptics/definition";

/**
 * Picking a piece up ticks like a picker; your piece landing has some weight, a jump more, and the other player's
 * move is a light tap as it lands (your turn). The board plays them on the move's own times, so they land with its sounds.
 */
export const CHECKERS_HAPTICS = defineHaptics({
  checkersPicked: { about: "You pick up one of your pieces (or tap one that can't move: nothing).", pulses: [{ at: 0, level: "selection" }] },
  checkersYourStep: { about: "Your piece lands on the square you moved it to.", pulses: [{ at: 0, level: "medium" }] },
  checkersYourJump: { about: "Your piece jumps one of theirs and lands.", pulses: [{ at: 0, level: "heavy" }] },
  checkersCrowned: { about: "Your man reached the far row: it is crowned king.", pulses: [{ at: 0, level: "medium" }, { at: 120, level: "heavy" }] },
  checkersOpponentMoved: { about: "The other player's move has played out: your turn.", pulses: [{ at: 0, level: "light" }] },
  checkersOpponentJumped: { about: "The other player jumped one of your pieces.", pulses: [{ at: 0, level: "medium" }] },
});
