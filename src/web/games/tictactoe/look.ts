import type { TicTacToeState } from "../../../shared/games/tictactoe/types";
import type { MatchLook } from "../matchLook";
import { TicTacToeBoard } from "./TicTacToeBoard";
import { lastMarkSound } from "./sounds";

/** Tic-tac-toe on the match screen: its board, and one mark sound per move. */
export const TICTACTOE_LOOK: MatchLook<TicTacToeState> = {
  Board: TicTacToeBoard,
  layout: "board",
  movesPlayed: (game) => game.board.filter((cell) => cell !== null).length,
  moveSteps: (_previous, game) => {
    const mark = lastMarkSound(game);
    return mark ? [{ ...mark, at: 0 }] : [];
  },
  lastMarkSound,
  opponentMoved: "ticTacToeOpponentMoved",
};
