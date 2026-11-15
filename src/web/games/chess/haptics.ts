import { defineHaptics } from "../../haptics/definition";

/**
 * Picking a piece up ticks like a picker; your piece setting down has some weight, a capture more, and the other
 * player's move is a light tap as it lands (your turn), stronger when it takes one of yours or puts you in check. The
 * board plays them on the move's own times, so they land with its sounds.
 */
export const CHESS_HAPTICS = defineHaptics({
  chessPicked: { about: "You pick up one of your pieces.", pulses: [{ at: 0, level: "selection" }] },
  chessYourMove: { about: "Your piece sets down on the square you moved it to.", pulses: [{ at: 0, level: "medium" }] },
  chessYourCapture: { about: "Your piece takes one of theirs.", pulses: [{ at: 0, level: "heavy" }] },
  chessPromoted: { about: "Your pawn reached the far row and became the piece you picked.", pulses: [{ at: 0, level: "medium" }, { at: 120, level: "heavy" }] },
  chessOpponentMoved: { about: "The other player's move has played out: your turn.", pulses: [{ at: 0, level: "light" }] },
  chessOpponentCaptured: { about: "The other player took one of your pieces.", pulses: [{ at: 0, level: "medium" }] },
  chessChecked: { about: "The other player's move puts your king in check.", pulses: [{ at: 0, level: "medium" }, { at: 110, level: "medium" }] },
});
