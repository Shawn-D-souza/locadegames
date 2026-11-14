import { LUDO_BOARDS } from "./config";
import type { Progress } from "./types";

/**
 * The board's squares as the rules see them (where they are drawn is the client's `geometry.ts`). Arms are numbered
 * clockwise, each 3 squares wide and `armLength` long: an outward column (from the middle to the tip), the tip's middle
 * square, an inward column (back to the middle); then the next arm. So the track is `arms × (2 × armLength + 1)`
 * squares, going clockwise. A player's start square is the inward column's second square from the tip; they go round
 * the whole track to their own arm's tip, then turn up its middle column (their home column) to home in the centre.
 * Like the classic board, which this is with 4 arms of 6.
 */
export interface LudoBoard {
  arms: number;
  armLength: number;
  /** Squares round the track. */
  track: number;
}

export function boardFor(players: number): LudoBoard {
  const { arms, armLength } = LUDO_BOARDS.find((b) => players <= b.upTo) ?? LUDO_BOARDS.at(-1)!;
  return { arms, armLength, track: arms * (2 * armLength + 1) };
}

/** Squares in one arm's stretch of the track. */
export const armSquares = (board: LudoBoard) => 2 * board.armLength + 1;

/** Each seat's arm: spread evenly round the board (2 players face each other). */
export function armOf(board: LudoBoard, seat: number, players: number): number {
  return Math.floor((seat * board.arms) / players);
}

/** The track square a player on `arm` starts on. */
export const startSquare = (board: LudoBoard, arm: number) => arm * armSquares(board) + board.armLength + 2;

/** The last track square on a player's path (their own arm's tip), as progress: then up the home column. */
export const lastTrackProgress = (board: LudoBoard) => board.track - 2;

/** Progress once home, in the centre: the track, then the home column's `armLength - 1` squares, then home. */
export const homeProgress = (board: LudoBoard) => lastTrackProgress(board) + board.armLength;

/** The track square a pawn on `arm` stands on at `progress`, or null in its base, home column or home. */
export function trackSquare(board: LudoBoard, arm: number, progress: Progress): number | null {
  if (progress < 0 || progress > lastTrackProgress(board)) return null;
  return (startSquare(board, arm) + progress) % board.track;
}

/**
 * Safe squares, where nobody can be captured: every arm's start square, and a star on every arm's outward column, the
 * third square from its tip (8 squares after the start before it, on the classic board).
 */
export function isSafe(board: LudoBoard, square: number): boolean {
  const along = square % armSquares(board);
  return along === board.armLength + 2 || along === board.armLength - 3;
}
