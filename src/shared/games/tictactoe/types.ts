import type { Seat } from "../types";

export type { Seat } from "../types";

export type Cell = Seat | null;

export interface TicTacToeState {
  board: Cell[];
  turn: Seat;
  winner: Seat | null;
  winningLine: number[] | null;
  isDraw: boolean;
  lastMove: number | null;
}
