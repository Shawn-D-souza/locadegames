import type { Seat } from "../types";

export type { Seat } from "../types";

export type PieceKind = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

/** What a pawn reaching the far row may become (the mover picks, owner decision). */
export type PromotionKind = "queen" | "rook" | "bishop" | "knight";

export const PROMOTION_KINDS: readonly PromotionKind[] = ["queen", "rook", "bishop", "knight"];

export interface Piece {
  seat: Seat;
  kind: PieceKind;
}

/** A square of the board: empty, or a piece. */
export type Square = Piece | null;

/**
 * A move as sent: the square a piece leaves and the one it goes to. Castling is the king's move two squares toward a
 * rook (the rook comes along); a pawn reaching the far row names what it becomes.
 */
export interface ChessMove {
  from: number;
  to: number;
  promotion?: PromotionKind;
}

/** The move just played, with what it did, so every phone can play it out. */
export interface PlayedMove {
  from: number;
  to: number;
  seat: Seat;
  /** The piece that moved, as it left (a pawn, when it was promoted). */
  kind: PieceKind;
  /** The piece it took and where it stood (not `to` when taken en passant). */
  captured: { square: number; kind: PieceKind } | null;
  promotion: PromotionKind | null;
  /** Castling: the rook's move. */
  castle: { from: number; to: number } | null;
  /** It puts the other king in check (or mates it). */
  check: boolean;
}

/** Whether a seat may still castle on each side (neither its king nor that rook has moved, and the rook is still there). */
export interface Castling {
  kingSide: boolean;
  queenSide: boolean;
}

/** How a game was won: checkmate, or the loser ran out of time: their whole clock, or the one move's limit. */
export type WinReason = "checkmate" | "clock" | "moveLimit";

/** Every draw is automatic (owner decision: no draw offers). */
export type DrawReason = "stalemate" | "material" | "repetition" | "quiet";

export interface ChessState {
  /** Row by row from the top: square `row × 8 + column`. Seat 0 starts at the bottom (rows 6–7), moves up and moves first, like White. */
  squares: Square[];
  turn: Seat;
  castling: [Castling, Castling];
  /** The square a pawn just passed over moving two, which a pawn beside it may take onto this turn (en passant). */
  enPassant: number | null;
  /** Ms left on each player's clock as the turn now running began (the mover's runs down from there). */
  clocks: [number, number];
  winner: Seat | null;
  winReason: WinReason | null;
  isDraw: boolean;
  drawReason: DrawReason | null;
  lastMove: PlayedMove | null;
  /** Moves played (each player's turn counts one). */
  plies: number;
  /** Moves in a row with no capture and no pawn moving (the 50-move rule counts both players'). */
  quietPlies: number;
  /** Every position since the last capture or pawn move (`positionKey`), for the repetition rule. */
  history: string[];
}
