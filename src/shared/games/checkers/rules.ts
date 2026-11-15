import type { MoveResult } from "../types";
import { CHECKERS_CONFIG, SQUARE_COUNT } from "./config";
import type { CheckersMove, CheckersState, PlayedMove, Seat, Square } from "./types";

const { size, startRows, quietMovesEach, repetitions } = CHECKERS_CONFIG;

export const squareAt = (row: number, column: number) => row * size + column;
export const rowOf = (square: number) => Math.floor(square / size);
export const columnOf = (square: number) => square % size;
/** Pieces only ever stand on the dark squares: each player's bottom-left corner is one. */
export const isDark = (square: number) => (rowOf(square) + columnOf(square)) % 2 === 1;

export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

/** Which way a seat's men go: seat 0 up the board (rows getting smaller), seat 1 down. */
const forward = (seat: Seat) => (seat === 0 ? -1 : 1);
/** The row a seat's men are crowned on: the far one. */
export const crownRow = (seat: Seat) => (seat === 0 ? 0 : size - 1);

/** The diagonal steps a piece may take, as [rows, columns]: men forward only, kings every way. */
function directions(seat: Seat, king: boolean): readonly (readonly [number, number])[] {
  const ahead = forward(seat);
  const own = [[ahead, -1], [ahead, 1]] as const;
  return king ? [...own, [-ahead, -1], [-ahead, 1]] : own;
}

/** The square `steps` diagonal steps from `square`, or null off the board. */
function stepFrom(square: number, [dr, dc]: readonly [number, number], steps: number): number | null {
  const row = rowOf(square) + dr * steps;
  const column = columnOf(square) + dc * steps;
  return row >= 0 && row < size && column >= 0 && column < size ? squareAt(row, column) : null;
}

export function createGame(firstTurn: Seat): CheckersState {
  const squares = Array<Square>(SQUARE_COUNT).fill(null);
  for (let square = 0; square < SQUARE_COUNT; square++) {
    if (!isDark(square)) continue;
    const row = rowOf(square);
    if (row < startRows) squares[square] = { seat: 1, king: false };
    else if (row >= size - startRows) squares[square] = { seat: 0, king: false };
  }
  return {
    squares,
    turn: firstTurn,
    winner: null,
    isDraw: false,
    drawReason: null,
    lastMove: null,
    plies: 0,
    quietPlies: 0,
    history: [positionKey(squares, firstTurn)],
  };
}

export function isGameOver(state: CheckersState): boolean {
  return state.winner !== null || state.isDraw;
}

/** The position as a short string (the dark squares in order, then whose turn it is), for the repetition rule. */
export function positionKey(squares: readonly Square[], turn: Seat): string {
  let key = "";
  for (let square = 0; square < SQUARE_COUNT; square++) {
    if (!isDark(square)) continue;
    const piece = squares[square];
    key += piece === null || piece === undefined ? "." : piece.seat === 0 ? (piece.king ? "A" : "a") : piece.king ? "B" : "b";
  }
  return key + turn;
}

/** Every jump chain `piece` can make from `square`, each played to its end (a man reaching the far row stops there). */
function jumpsFrom(squares: readonly Square[], start: number): CheckersMove[] {
  const piece = squares[start]!;
  const chains: CheckersMove[] = [];
  const walk = (at: number, path: number[], taken: number[]) => {
    let extended = false;
    for (const direction of directions(piece.seat, piece.king)) {
      const over = stepFrom(at, direction, 1);
      const land = stepFrom(at, direction, 2);
      if (over === null || land === null || taken.includes(over)) continue;
      const jumped = squares[over];
      // The piece's own starting square is empty once it has left it.
      if (!jumped || jumped.seat === piece.seat || (squares[land] !== null && land !== start)) continue;
      extended = true;
      const crowned = !piece.king && rowOf(land) === crownRow(piece.seat);
      if (crowned) chains.push({ from: start, path: [...path, land] });
      else walk(land, [...path, land], [...taken, over]);
    }
    if (!extended && path.length > 0) chains.push({ from: start, path });
  };
  walk(start, [], []);
  return chains;
}

/** Every move `seat` may make now. A capture must be taken when there is one (owner decision), and played to its end. */
export function legalMoves(squares: readonly Square[], seat: Seat): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const steps: CheckersMove[] = [];
  for (let square = 0; square < SQUARE_COUNT; square++) {
    const piece = squares[square];
    if (!piece || piece.seat !== seat) continue;
    jumps.push(...jumpsFrom(squares, square));
    if (jumps.length) continue;
    for (const direction of directions(seat, piece.king)) {
      const to = stepFrom(square, direction, 1);
      if (to !== null && squares[to] === null) steps.push({ from: square, path: [to] });
    }
  }
  return jumps.length ? jumps : steps;
}

/** The square jumped over between two squares two diagonal steps apart, or null for a plain step. */
export function jumpedBetween(from: number, to: number): number | null {
  const dr = rowOf(to) - rowOf(from);
  const dc = columnOf(to) - columnOf(from);
  return Math.abs(dr) === 2 && Math.abs(dc) === 2 ? squareAt(rowOf(from) + dr / 2, columnOf(from) + dc / 2) : null;
}

const sameMove = (a: CheckersMove, b: CheckersMove) => a.from === b.from && a.path.length === b.path.length && a.path.every((square, i) => square === b.path[i]);

/** Pure move: plays `seat`'s whole move; returns a new state, never mutates the input. */
export function applyMove(state: CheckersState, seat: Seat, move: CheckersMove): MoveResult<CheckersState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if (state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  if (!legalMoves(state.squares, seat).some((legal) => sameMove(legal, move))) return { ok: false, error: "INVALID_MOVE" };

  const squares = state.squares.slice();
  const piece = squares[move.from]!;
  const captured: number[] = [];
  let at = move.from;
  for (const land of move.path) {
    const over = jumpedBetween(at, land);
    if (over !== null) captured.push(over);
    at = land;
  }
  for (const square of captured) squares[square] = null;
  squares[move.from] = null;
  const crowned = !piece.king && rowOf(at) === crownRow(seat);
  squares[at] = { seat, king: piece.king || crowned };

  const next = otherSeat(seat);
  const lastMove: PlayedMove = { from: move.from, path: [...move.path], seat, captured, crowned };
  const plies = state.plies + 1;
  // Losing: no pieces left, or none that can move.
  if (legalMoves(squares, next).length === 0) {
    return { ok: true, state: { ...state, squares, turn: next, winner: seat, lastMove, plies } };
  }
  // A capture or a man moving can never be undone, so the counts start again there.
  const progress = captured.length > 0 || !piece.king;
  const quietPlies = progress ? 0 : state.quietPlies + 1;
  const key = positionKey(squares, next);
  const history = progress ? [key] : [...state.history, key];
  const repeated = history.filter((seen) => seen === key).length >= repetitions;
  const quiet = quietPlies >= quietMovesEach * 2;
  const drawReason = repeated ? "repetition" : quiet ? "quiet" : null;
  return {
    ok: true,
    state: { squares, turn: next, winner: null, isDraw: drawReason !== null, drawReason, lastMove, plies, quietPlies, history },
  };
}

/** The first legal move in the board's reading order (my call: a timeout plays it; deterministic, and seldom a good one). */
export function firstLegalMove(state: CheckersState): CheckersMove {
  return legalMoves(state.squares, state.turn)[0] ?? { from: 0, path: [] };
}

/** Reads an untrusted move from the wire: a start square and 1–12 landing squares on the board, or null. */
export function parseMove(raw: unknown): CheckersMove | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { from, path } = raw as { from?: unknown; path?: unknown };
  const onBoard = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < SQUARE_COUNT;
  if (!onBoard(from) || !Array.isArray(path) || path.length === 0 || path.length > 12 || !path.every(onBoard)) return null;
  return { from, path: [...path] };
}
