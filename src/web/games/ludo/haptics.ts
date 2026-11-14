import { defineHaptics } from "../../haptics/definition";

/**
 * Ludo in your hand (the die landing and a 6 are the shared die's, `dice/haptics.ts`): your own moves, and one of
 * yours being captured. Others' moves and every hop stay out of it (never constant).
 */
export const LUDO_HAPTICS = defineHaptics({
  ludoEnter: { about: "Your pawn comes out of its base.", pulses: [{ at: 0, level: "light" }] },
  ludoCapture: { about: "You captured a pawn: a hit that lands.", pulses: [{ at: 0, level: "medium" }, { at: 100, level: "heavy" }] },
  ludoCaptured: { about: "Your pawn was captured: a hit, then it fades as it flies home.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  ludoPawnHome: { about: "Your pawn reaches home.", pulses: [{ at: 0, level: "light" }, { at: 90, level: "medium" }] },
  ludoFinished: { about: "Your last pawn gets home.", pulses: [{ at: 0, level: "light" }, { at: 80, level: "medium" }, { at: 160, level: "heavy" }] },
  ludoThreeSixes: { about: "Your third 6 in a row: the turn is over.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
  ludoYourTurn: { about: "Your roll came round.", pulses: [{ at: 0, level: "light" }] },
  ludoPick: { about: "Your roll can move more than one pawn: pick one.", pulses: [{ at: 0, level: "selection" }, { at: 90, level: "selection" }] },
});
