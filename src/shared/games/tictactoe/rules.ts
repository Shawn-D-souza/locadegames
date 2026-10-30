import { CELL_COUNT, TICTACTOE_CONFIG } from "./config";
import type { MoveResult } from "../types";
import type { Cell, Seat, TicTacToeState } from "./types";

/** Every row, column and diagonal as lists of cell indexes. */
function buildLines(size: number): number[][] {
  const range = Array.from({ length: size }, (_, i) => i);
  const rows = range.map((r) => range.map((c) => r * size + c));
  const cols = range.map((c) => range.map((r) => r * size + c));
  const diagonals = [range.map((i) => i * size + i), range.map((i) => i * size + (size - 1 - i))];
  return [...rows, ...cols, ...diagonals];
}

export const LINES = buildLines(TICTACTOE_CONFIG.boardSize);

export function createGame(firstTurn: Seat): TicTacToeState {
  return {
    board: Array<Cell>(CELL_COUNT).fill(null),
    turn: firstTurn,
    winner: null,
    winningLine: null,
    isDraw: false,
    lastMove: null,
  };
}

export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

export function isGameOver(state: TicTacToeState): boolean {
  return state.winner !== null || state.isDraw;
}

export function findWinningLine(board: readonly Cell[]): number[] | null {
  return (
    LINES.find((line) => {
      const first = board[line[0]!];
      return first !== null && line.every((index) => board[index] === first);
    }) ?? null
  );
}

/** Pure move: returns a new state, never mutates the input. */
export function applyMove(state: TicTacToeState, seat: Seat, cell: number): MoveResult<TicTacToeState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if (state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) {
    return { ok: false, error: "INVALID_MOVE" };
  }
  if (state.board[cell] !== null) return { ok: false, error: "CELL_TAKEN" };

  const board = state.board.slice();
  board[cell] = seat;
  const winningLine = findWinningLine(board);
  const isDraw = winningLine === null && board.every((c) => c !== null);

  return {
    ok: true,
    state: {
      board,
      turn: otherSeat(seat),
      winner: winningLine ? seat : null,
      winningLine,
      isDraw,
      lastMove: cell,
    },
  };
}
