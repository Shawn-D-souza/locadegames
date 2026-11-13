import { seatsToMove } from "../../../shared/games/seabattle/rules";
import type { SeaBattleState } from "../../../shared/games/seabattle/types";
import type { MatchLook } from "../matchLook";
import { SeaBattleBoard } from "./SeaBattleBoard";
import { lastMarkSound } from "./seaBattleCues";

/**
 * Sea Battle on the match screen: two boards (the waters being fired at big, the other small with the shooter's
 * cannon), avatars on the cards. A shot's sounds and feels are the board's, on the stage's own timeline
 * (`useSeaBattleSounds`), not when the room view comes in; the match screen plays only the last shot's landing, as the
 * ending starts.
 */
export const SEABATTLE_LOOK: MatchLook<SeaBattleState> = {
  Board: SeaBattleBoard,
  layout: "twoBoards",
  pieces: false,
  cards: "slim",
  toMove: seatsToMove,
  winningLine: () => null,
  movesPlayed: (game) => game.shots,
  moveSteps: () => [],
  lastMarkSound,
  opponentMoved: null,
  playsMovesOut: true,
};
