import { defineHaptics } from "../../haptics/definition";

/** Placing a mark is the game, so it's felt firmly, the moment your finger lands; the other player's says it's your turn. */
export const TICTACTOE_HAPTICS = defineHaptics({
  ticTacToeMarkPlaced: { about: "You tap a cell: your mark goes down.", pulses: [{ at: 0, level: "medium" }] },
  ticTacToeOpponentMoved: { about: "The other player's mark landed: your turn.", pulses: [{ at: 0, level: "light" }] },
});
