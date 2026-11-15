import type { MoveResult } from "../types";
import { CELL_COUNT, FOURINAROW_CONFIG } from "./config";
import type { Cell, Column, FourInARowState, Seat } from "./types";

const { columns, rows, lineLength } = FOURINAROW_CONFIG;

/** The four directions a line can run in: across, down, and both diagonals. */
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

export const cellAt = (row: number, column: number) => row * columns + column;
export const rowOf = (cell: number) => Math.floor(cell / columns);
export const columnOf = (cell: number) => cell % columns;

export function createGame(firstTurn: Seat): FourInARowState {
  return {
    cells: Array<Cell>(CELL_COUNT).fill(null),
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

export function isGameOver(state: FourInARowState): boolean {
  return state.winner !== null || state.isDraw;
}

/** The row a disc dropped in `column` lands on, or null if the column is full. */
export function landingRow(cells: readonly Cell[], column: Column): number | null {
  for (let row = rows - 1; row >= 0; row--) if (cells[cellAt(row, column)] === null) return row;
  return null;
}

/** The run through `cell` of its own disc, end to end, if it is at least a line long; across first, then down, then the diagonals. */
export function lineThrough(cells: readonly Cell[], cell: number): number[] | null {
  const seat = cells[cell];
  if (seat === null || seat === undefined) return null;
  const row = rowOf(cell);
  const column = columnOf(cell);
  const walk = (dr: number, dc: number) => {
    const run: number[] = [];
    for (let r = row + dr, c = column + dc; r >= 0 && r < rows && c >= 0 && c < columns && cells[cellAt(r, c)] === seat; r += dr, c += dc) {
      run.push(cellAt(r, c));
    }
    return run;
  };
  for (const [dr, dc] of DIRECTIONS) {
    const line = [...walk(-dr, -dc).reverse(), cell, ...walk(dr, dc)];
    if (line.length >= lineLength) return line;
  }
  return null;
}

/** Pure move: drops `seat`'s disc in `column`; returns a new state, never mutates the input. */
export function applyMove(state: FourInARowState, seat: Seat, column: Column): MoveResult<FourInARowState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if (state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  if (!Number.isInteger(column) || column < 0 || column >= columns) return { ok: false, error: "INVALID_MOVE" };
  const row = landingRow(state.cells, column);
  if (row === null) return { ok: false, error: "CELL_TAKEN" };

  const cell = cellAt(row, column);
  const cells = state.cells.slice();
  cells[cell] = seat;
  const winningLine = lineThrough(cells, cell);
  return {
    ok: true,
    state: {
      cells,
      turn: otherSeat(seat),
      winner: winningLine ? seat : null,
      winningLine,
      isDraw: winningLine === null && cells.every((c) => c !== null),
      lastMove: cell,
    },
  };
}

/** The leftmost column with room (owner decision: a timeout drops there; a weak move, so running out of time costs something). */
export function leftmostOpenColumn(state: FourInARowState): Column {
  for (let column = 0; column < columns; column++) if (landingRow(state.cells, column) !== null) return column;
  return 0;
}
