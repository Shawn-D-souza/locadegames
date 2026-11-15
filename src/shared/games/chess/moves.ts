import { CHESS_CONFIG, SQUARE_COUNT } from "./config";
import { PROMOTION_KINDS, type Castling, type ChessMove, type PieceKind, type Seat, type Square } from "./types";

/**
 * The board's geometry and every legal move, pure: squares are numbered row by row from the top. Seat 0 starts at the
 * bottom and moves up.
 */

const { size } = CHESS_CONFIG;

export const squareAt = (row: number, column: number) => row * size + column;
export const rowOf = (square: number) => Math.floor(square / size);
export const columnOf = (square: number) => square % size;
/** The light squares: each player's bottom-right corner is one, as on a real board. */
export const isLight = (square: number) => (rowOf(square) + columnOf(square)) % 2 === 0;

export const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
/** Which way a seat's pawns go: seat 0 up the board (rows getting smaller), seat 1 down. */
const forward = (seat: Seat) => (seat === 0 ? -1 : 1);
/** A seat's back row, where its pieces start. */
export const backRow = (seat: Seat) => (seat === 0 ? size - 1 : 0);
/** The row a seat's pawns are promoted on: the far one. */
export const promotionRow = (seat: Seat) => backRow(otherSeat(seat));
const pawnRow = (seat: Seat) => backRow(seat) + forward(seat);

/** The back row, left to right, the same for both (the queen on her own color, the kings face to face). */
export const BACK_ROW: readonly PieceKind[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
const KING_COLUMN = 4;

const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const;
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;
const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

/** The square `steps` steps of [rows, columns] from `square`, or null off the board. */
function stepFrom(square: number, [dr, dc]: readonly [number, number], steps = 1): number | null {
  const row = rowOf(square) + dr * steps;
  const column = columnOf(square) + dc * steps;
  return row >= 0 && row < size && column >= 0 && column < size ? squareAt(row, column) : null;
}

export function startingSquares(): Square[] {
  const squares = Array<Square>(SQUARE_COUNT).fill(null);
  for (const seat of [0, 1] as const) {
    BACK_ROW.forEach((kind, column) => {
      squares[squareAt(backRow(seat), column)] = { seat, kind };
      squares[squareAt(pawnRow(seat), column)] = { seat, kind: "pawn" };
    });
  }
  return squares;
}

export const kingSquare = (squares: readonly Square[], seat: Seat) =>
  squares.findIndex((piece) => piece?.seat === seat && piece.kind === "king");

/** Whether any of `by`'s pieces attacks `square`. */
export function isAttacked(squares: readonly Square[], square: number, by: Seat): boolean {
  const holds = (at: number | null, ...kinds: PieceKind[]) => {
    const piece = at === null ? null : squares[at];
    return piece !== null && piece !== undefined && piece.seat === by && kinds.includes(piece.kind);
  };
  // A pawn attacks one step forward and to the side: look one step back from the square, from its side.
  if (holds(stepFrom(square, [-forward(by), -1]), "pawn") || holds(stepFrom(square, [-forward(by), 1]), "pawn")) return true;
  if (KNIGHT_STEPS.some((step) => holds(stepFrom(square, step), "knight"))) return true;
  if (KING_STEPS.some((step) => holds(stepFrom(square, step), "king"))) return true;
  const slides = (directions: readonly (readonly [number, number])[], ...kinds: PieceKind[]) =>
    directions.some((direction) => {
      for (let at = stepFrom(square, direction); at !== null; at = stepFrom(at, direction)) {
        if (squares[at] !== null) return holds(at, ...kinds);
      }
      return false;
    });
  return slides(STRAIGHT, "rook", "queen") || slides(DIAGONAL, "bishop", "queen");
}

export function inCheck(squares: readonly Square[], seat: Seat): boolean {
  const king = kingSquare(squares, seat);
  return king !== -1 && isAttacked(squares, king, otherSeat(seat));
}

/** A move's effect on the board: the squares after it, what it took (and where), the rook's move when castling. */
export interface MoveEffect {
  squares: Square[];
  captured: { square: number; kind: PieceKind } | null;
  castle: { from: number; to: number } | null;
}

/** Plays a move on the board, legal or not (the caller checks); never mutates the input. */
export function playOnBoard(squares: readonly Square[], move: ChessMove, enPassant: number | null): MoveEffect {
  const next = squares.slice();
  const piece = next[move.from]!;
  let captured: MoveEffect["captured"] = null;
  let castle: MoveEffect["castle"] = null;
  const target = next[move.to];
  if (target) captured = { square: move.to, kind: target.kind };
  if (piece.kind === "pawn" && move.to === enPassant && !target) {
    // The pawn taken en passant stands beside the mover, behind the square it moves to.
    const taken = squareAt(rowOf(move.from), columnOf(move.to));
    captured = { square: taken, kind: "pawn" };
    next[taken] = null;
  }
  if (piece.kind === "king" && Math.abs(columnOf(move.to) - columnOf(move.from)) === 2) {
    const kingSide = columnOf(move.to) > columnOf(move.from);
    const row = rowOf(move.from);
    castle = { from: squareAt(row, kingSide ? size - 1 : 0), to: squareAt(row, kingSide ? columnOf(move.to) - 1 : columnOf(move.to) + 1) };
    next[castle.to] = next[castle.from]!;
    next[castle.from] = null;
  }
  next[move.from] = null;
  next[move.to] = move.promotion ? { seat: piece.seat, kind: move.promotion } : piece;
  return { squares: next, captured, castle };
}

/** Every move `seat`'s piece on `from` could make, before checking its own king is safe (castling's safety is checked here). */
function pieceMoves(squares: readonly Square[], from: number, castling: Castling, enPassant: number | null): ChessMove[] {
  const piece = squares[from]!;
  const { seat } = piece;
  const moves: ChessMove[] = [];
  const isFoe = (at: number) => squares[at] !== null && squares[at]!.seat !== seat;
  const add = (to: number) => {
    if (piece.kind === "pawn" && rowOf(to) === promotionRow(seat)) PROMOTION_KINDS.forEach((promotion) => moves.push({ from, to, promotion }));
    else moves.push({ from, to });
  };
  const leap = (steps: readonly (readonly [number, number])[]) => {
    for (const step of steps) {
      const to = stepFrom(from, step);
      if (to !== null && (squares[to] === null || isFoe(to))) add(to);
    }
  };
  const slide = (directions: readonly (readonly [number, number])[]) => {
    for (const direction of directions) {
      for (let to = stepFrom(from, direction); to !== null; to = stepFrom(to, direction)) {
        if (squares[to] === null) add(to);
        else {
          if (isFoe(to)) add(to);
          break;
        }
      }
    }
  };
  switch (piece.kind) {
    case "pawn": {
      const ahead = forward(seat);
      const one = stepFrom(from, [ahead, 0]);
      if (one !== null && squares[one] === null) {
        add(one);
        const two = stepFrom(from, [ahead, 0], 2);
        if (rowOf(from) === pawnRow(seat) && two !== null && squares[two] === null) add(two);
      }
      for (const side of [-1, 1]) {
        const to = stepFrom(from, [ahead, side]);
        if (to !== null && (isFoe(to) || to === enPassant)) add(to);
      }
      break;
    }
    case "knight":
      leap(KNIGHT_STEPS);
      break;
    case "bishop":
      slide(DIAGONAL);
      break;
    case "rook":
      slide(STRAIGHT);
      break;
    case "queen":
      slide([...STRAIGHT, ...DIAGONAL]);
      break;
    case "king": {
      leap(KING_STEPS);
      const row = backRow(seat);
      if (from !== squareAt(row, KING_COLUMN)) break;
      const foe = otherSeat(seat);
      const empty = (...columns: number[]) => columns.every((column) => squares[squareAt(row, column)] === null);
      const safe = (...columns: number[]) => columns.every((column) => !isAttacked(squares, squareAt(row, column), foe));
      const rookAt = (column: number) => squares[squareAt(row, column)]?.seat === seat && squares[squareAt(row, column)]?.kind === "rook";
      // The king may not castle out of, through or into check.
      if (castling.kingSide && rookAt(size - 1) && empty(5, 6) && safe(4, 5, 6)) moves.push({ from, to: squareAt(row, 6) });
      if (castling.queenSide && rookAt(0) && empty(1, 2, 3) && safe(4, 3, 2)) moves.push({ from, to: squareAt(row, 2) });
      break;
    }
  }
  return moves;
}

/** Every move `seat` may make: none may leave its own king in check. */
export function legalMovesOn(squares: readonly Square[], seat: Seat, castling: Castling, enPassant: number | null): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let from = 0; from < SQUARE_COUNT; from++) {
    if (squares[from]?.seat !== seat) continue;
    for (const move of pieceMoves(squares, from, castling, enPassant)) {
      if (!inCheck(playOnBoard(squares, move, enPassant).squares, seat)) moves.push(move);
    }
  }
  return moves;
}

/**
 * Neither side can ever checkmate, whatever is played (a draw at once): kings alone, a king and one bishop or knight
 * against a king, or kings and bishops all on squares of one color.
 */
export function insufficientMaterial(squares: readonly Square[]): boolean {
  const others = squares.flatMap((piece, square) => (piece && piece.kind !== "king" ? [{ ...piece, square }] : []));
  if (others.length === 0) return true;
  if (others.length === 1 && (others[0]!.kind === "bishop" || others[0]!.kind === "knight")) return true;
  return others.every((piece) => piece.kind === "bishop") && new Set(others.map((piece) => isLight(piece.square))).size === 1;
}
