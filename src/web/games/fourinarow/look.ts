import type { FourInARowState } from "../../../shared/games/fourinarow/types";
import type { MatchLook } from "../matchLook";
import { Disc } from "./Disc";
import { FourInARowBoard } from "./FourInARowBoard";
import { lastDiscSound } from "./sounds";

/** 4 in a Row on the match screen: the board with its aiming row, the discs on the cards, and each disc's clack. */
export const FOURINAROW_LOOK: MatchLook<FourInARowState> = {
  Board: FourInARowBoard,
  Piece: Disc,
  cards: "full",
  toMove: (game) => (game.winner !== null || game.isDraw ? [] : [game.turn]),
  winningLine: (game) => game.winningLine,
  // Seven columns need more width than tic-tac-toe's three; in landscape it sits beside the cards, sized to the screen's height.
  layout: "largeBoard",
  movesPlayed: (game) => game.cells.filter((cell) => cell !== null).length,
  moveSteps: (_previous, game, viewer) => {
    const disc = lastDiscSound(game, viewer);
    return disc ? [{ ...disc, at: 0 }] : [];
  },
  lastMarkSound: lastDiscSound,
  // The board feels each landing itself, as the disc lands.
  opponentMoved: null,
};
