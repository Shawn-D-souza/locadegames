import { durations } from "../../../theme";
import { defineHaptics } from "../../haptics/definition";

/** The big mark stamps on once the line has drawn (felt from when the board's sound starts). */
const STAMP_AT = durations.lineDraw;

/** Placing a mark is the game, so it's felt firmly, the moment your finger lands; the other player's says it's your turn; winning a small board is a small climb. */
export const ULTIMATE_HAPTICS = defineHaptics({
  ultimateMarkPlaced: { about: "You tap a cell: your mark goes down.", pulses: [{ at: 0, level: "medium" }] },
  ultimateOpponentMoved: { about: "The other player's mark landed: your turn.", pulses: [{ at: 0, level: "light" }] },
  ultimateBoardClaimed: {
    about: "You won a small board: its line slashes through, then your big mark stamps on.",
    pulses: [
      { at: 0, level: "selection" },
      { at: STAMP_AT, level: "light" },
      { at: STAMP_AT + 90, level: "medium" },
    ],
  },
});
