import type { CheckersState } from "../../../shared/games/checkers/types";
import type { Seat } from "../../../shared/games/types";
import type { MatchLook } from "../matchLook";
import { Checker } from "./Checker";
import { CheckersBoard } from "./CheckersBoard";

/** A plain piece on the seat cards (yours ringed). */
function CheckerPiece({ seat, viewer, className }: { seat: Seat; viewer: Seat | null; className?: string }) {
  return <Checker seat={seat} viewer={viewer} className={className} />;
}

/** Checkers on the match screen: the board plays every move out itself, with its sounds and feels. */
export const CHECKERS_LOOK: MatchLook<CheckersState> = {
  Board: CheckersBoard,
  Piece: CheckerPiece,
  cards: "full",
  toMove: (game) => (game.winner !== null || game.isDraw ? [] : [game.turn]),
  // A win takes the other's pieces or leaves them stuck: there's no line to draw.
  winningLine: () => null,
  // Eight columns need the width; in landscape it sits beside the cards, sized to the screen's height.
  layout: "largeBoard",
  movesPlayed: (game) => game.plies,
  // The board plays each move's sounds hop by hop as it plays it out, the last one too (the ending waits for it).
  moveSteps: () => [],
  lastMarkSound: () => null,
  opponentMoved: null,
  playsMovesOut: true,
};
