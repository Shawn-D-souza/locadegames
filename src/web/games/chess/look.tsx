import type { ChessState } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import type { MatchLook } from "../matchLook";
import { ChessBoard } from "./ChessBoard";
import { ChessPiece } from "./ChessPiece";
import { endDetail } from "./endDetail";

/** A king on the seat cards (yours banded). */
function KingPiece({ seat, viewer, className }: { seat: Seat; viewer: Seat | null; className?: string }) {
  return <ChessPiece kind="king" seat={seat} viewer={viewer} className={className} />;
}

/** Chess on the match screen: the board plays every move out itself, with its sounds and feels; the cards show each player's clock. */
export const CHESS_LOOK: MatchLook<ChessState> = {
  Board: ChessBoard,
  Piece: KingPiece,
  cards: "full",
  toMove: (game) => (game.winner !== null || game.isDraw ? [] : [game.turn]),
  // A win is a checkmate or the clock: there's no line to draw.
  winningLine: () => null,
  // Eight columns need the width; in landscape it sits beside the cards, sized to the screen's height.
  layout: "largeBoard",
  movesPlayed: (game) => game.plies,
  // The board plays each move's sounds as it plays it out, the last one too (the ending waits for it).
  moveSteps: () => [],
  lastMarkSound: () => null,
  opponentMoved: null,
  playsMovesOut: true,
  clocks: (game) => game.clocks,
  endDetail,
};
