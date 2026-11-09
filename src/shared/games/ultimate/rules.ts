import { findWinningLine, otherSeat } from "../tictactoe/rules";
import type { MoveResult } from "../types";
import { BOARD_COUNT, CELL_COUNT, SMALL_CELLS } from "./config";
import type { Cell, Seat, SmallBoard, UltimateState } from "./types";

export function createGame(firstTurn: Seat): UltimateState {
  return {
    cells: Array<Cell>(CELL_COUNT).fill(null),
    boards: Array<SmallBoard>(BOARD_COUNT).fill(null),
    turn: firstTurn,
    next: null,
    winner: null,
    winningLine: null,
    isDraw: false,
    lastMove: null,
  };
}

/** Which small board a cell is in, and where in it (0–8 each). */
export const boardOf = (cell: number) => Math.floor(cell / SMALL_CELLS);
export const placeOf = (cell: number) => cell % SMALL_CELLS;

/** The 9 cells of one small board. */
export function smallCells(cells: readonly Cell[], board: number): Cell[] {
  return cells.slice(board * SMALL_CELLS, (board + 1) * SMALL_CELLS);
}

export function isGameOver(state: UltimateState): boolean {
  return state.winner !== null || state.isDraw;
}

/** Whether a small board can be played in this turn: it's open, and it's the one you were sent to (or you may play anywhere). */
export function isPlayableBoard(state: UltimateState, board: number): boolean {
  return !isGameOver(state) && state.boards[board] === null && (state.next === null || state.next === board);
}

/** The line a won small board was won with (its own cells 0–8), or null. */
export function smallWinningLine(state: UltimateState, board: number): number[] | null {
  return state.boards[board] === 0 || state.boards[board] === 1 ? findWinningLine(smallCells(state.cells, board)) : null;
}

/** How a small board stands after its cells change: won, full (a draw, counts for nobody), or still open. */
export function judgeBoard(cells: readonly Cell[]): SmallBoard {
  const line = findWinningLine(cells);
  if (line) return cells[line[0]!]!;
  return cells.every((cell) => cell !== null) ? "draw" : null;
}

/**
 * Pure move: returns a new state, never mutates the input. Your cell's place in its small board sends the other
 * player to that small board; if it is already won or full, they may play in any open board.
 */
export function applyMove(state: UltimateState, seat: Seat, cell: number): MoveResult<UltimateState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if (state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) return { ok: false, error: "INVALID_MOVE" };
  if (!isPlayableBoard(state, boardOf(cell))) return { ok: false, error: "INVALID_MOVE" };
  if (state.cells[cell] !== null) return { ok: false, error: "CELL_TAKEN" };

  const cells = state.cells.slice();
  cells[cell] = seat;
  const boards = state.boards.slice();
  boards[boardOf(cell)] = judgeBoard(smallCells(cells, boardOf(cell)));

  // The big board: three small boards in a row won by the same player; a full small board counts for nobody.
  const winningLine = findWinningLine(boards.map((board) => (board === "draw" ? null : board)));
  const isDraw = winningLine === null && boards.every((board) => board !== null);
  const sentTo = placeOf(cell);

  return {
    ok: true,
    state: {
      cells,
      boards,
      turn: otherSeat(seat),
      next: boards[sentTo] === null ? sentTo : null,
      winner: winningLine ? seat : null,
      winningLine,
      isDraw,
      lastMove: cell,
    },
  };
}

/** The first empty cell you may play in: predictable, so a timeout is a penalty and never a lucky break. */
export function firstPlayableCell(state: UltimateState): number {
  return state.cells.findIndex((value, cell) => value === null && isPlayableBoard(state, boardOf(cell)));
}
