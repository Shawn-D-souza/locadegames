import { CELL_COUNT } from "../../../shared/games/ultimate/config";
import type { UltimateState } from "../../../shared/games/ultimate/types";
import type { MatchLook } from "../matchLook";
import { lastMarkSound } from "./sounds";
import { UltimateBoard } from "./UltimateBoard";
import { ultimateMoveSteps } from "./ultimateCues";

/** Ultimate Tic-tac-toe on the match screen: the big board, its marks, and its small boards being won. */
export const ULTIMATE_LOOK: MatchLook<UltimateState> = {
  Board: UltimateBoard,
  layout: "largeBoard",
  movesPlayed: (game) => CELL_COUNT - game.cells.filter((cell) => cell === null).length,
  moveSteps: ultimateMoveSteps,
  lastMarkSound,
  opponentMoved: "ultimateOpponentMoved",
};
