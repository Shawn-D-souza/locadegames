import type { Seat } from "../types";

export type { Seat } from "../types";

/** A piece on the board: a man, or a king once it has reached the far row. */
export interface Piece {
  seat: Seat;
  king: boolean;
}

/** A square of the board: empty (light squares always are), or a piece. */
export type Square = Piece | null;

/**
 * A move as sent: the square the piece starts on and every square it lands on, in order (one for a step or a single
 * jump, more for a chain of jumps). A chain is always played to its end.
 */
export interface CheckersMove {
  from: number;
  path: number[];
}

/** The move just played, with what it did, so every phone can play it out. */
export interface PlayedMove extends CheckersMove {
  seat: Seat;
  /** The squares of the pieces it took, in the order they were jumped. */
  captured: number[];
  /** A man reached the far row and became a king (it ends the move). */
  crowned: boolean;
}

export type DrawReason = "quiet" | "repetition";

export interface CheckersState {
  /** Row by row from the top: square `row × 8 + column`. Seat 0 starts at the bottom (rows 5–7) and moves up. */
  squares: Square[];
  turn: Seat;
  winner: Seat | null;
  isDraw: boolean;
  drawReason: DrawReason | null;
  lastMove: PlayedMove | null;
  /** Moves played (each player's turn counts one). */
  plies: number;
  /** Moves in a row with no capture and no man moving (the 40-move rule counts both players'). */
  quietPlies: number;
  /** Every position since the last capture or man move (`positionKey`), for the repetition rule; none can come back past one. */
  history: string[];
}
