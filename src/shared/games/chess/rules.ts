import type { MoveResult } from "../types";
import { CHESS_CONFIG, SQUARE_COUNT } from "./config";
import { backRow, columnOf, inCheck, insufficientMaterial, legalMovesOn, otherSeat, playOnBoard, rowOf, squareAt, startingSquares } from "./moves";
import { PROMOTION_KINDS, type Castling, type ChessMove, type ChessState, type DrawReason, type PlayedMove, type PromotionKind, type Seat, type Square } from "./types";

const { size, clockMs, incrementMs, moveLimitMs, quietMovesEach, repetitions } = CHESS_CONFIG;

const BOTH_SIDES: Castling = { kingSide: true, queenSide: true };

export function createGame(firstTurn: Seat): ChessState {
  const squares = startingSquares();
  const castling: [Castling, Castling] = [BOTH_SIDES, BOTH_SIDES];
  return {
    squares,
    turn: firstTurn,
    castling,
    enPassant: null,
    clocks: [clockMs, clockMs],
    winner: null,
    winReason: null,
    isDraw: false,
    drawReason: null,
    lastMove: null,
    plies: 0,
    quietPlies: 0,
    history: [positionKey(squares, firstTurn, castling, null)],
  };
}

export function isGameOver(state: ChessState): boolean {
  return state.winner !== null || state.isDraw;
}

/** Every move the side to move may make now (none once the game is over). */
export function legalMoves(state: ChessState): ChessMove[] {
  return isGameOver(state) ? [] : legalMovesOn(state.squares, state.turn, state.castling[state.turn], state.enPassant);
}

const PIECE_LETTERS = { pawn: "p", knight: "n", bishop: "b", rook: "r", queen: "q", king: "k" } as const;

/**
 * The position as a short string, for the repetition rule: the pieces, whose turn, the castling rights and an en
 * passant square only when a pawn could really take there (the rule's "same position" means the same moves are open).
 */
export function positionKey(squares: readonly Square[], turn: Seat, castling: readonly [Castling, Castling], enPassant: number | null): string {
  let key = "";
  for (const piece of squares) key += piece ? (piece.seat === 0 ? PIECE_LETTERS[piece.kind].toUpperCase() : PIECE_LETTERS[piece.kind]) : ".";
  const rights = castling.map((c) => `${c.kingSide ? "k" : "-"}${c.queenSide ? "q" : "-"}`).join("");
  const passable =
    enPassant !== null &&
    legalMovesOn(squares, turn, castling[turn], enPassant).some((move) => move.to === enPassant && squares[move.from]?.kind === "pawn");
  return `${key}${turn}${rights}${passable ? enPassant : ""}`;
}

/** The castling rights left once a move from `from` to `to` is played: a king moving loses both, a rook moving or taken loses its side. */
function castlingAfter(castling: readonly [Castling, Castling], squares: readonly Square[], from: number, to: number): [Castling, Castling] {
  const next: [Castling, Castling] = [{ ...castling[0] }, { ...castling[1] }];
  const mover = squares[from]!;
  if (mover.kind === "king") next[mover.seat] = { kingSide: false, queenSide: false };
  for (const seat of [0, 1] as const) {
    for (const square of [from, to]) {
      if (square === squareAt(backRow(seat), 0)) next[seat].queenSide = false;
      if (square === squareAt(backRow(seat), size - 1)) next[seat].kingSide = false;
    }
  }
  return next;
}

/** How long the turn now running may last: the move's limit, or the mover's clock if less is left on it. */
export function turnTimeMs(state: ChessState): number {
  return Math.min(moveLimitMs, state.clocks[state.turn]);
}

/** The mover ran out of time (their clock, or the one move's limit): they lose at once (owner decision: no move is played for them). */
export function expire(state: ChessState): ChessState {
  if (isGameOver(state)) return state;
  const mover = state.turn;
  const clocks: [number, number] = [...state.clocks];
  const ranOutOfClock = clocks[mover] <= moveLimitMs;
  clocks[mover] = Math.max(0, clocks[mover] - turnTimeMs(state));
  return { ...state, clocks, winner: otherSeat(mover), winReason: ranOutOfClock ? "clock" : "moveLimit" };
}

const sameMove = (a: ChessMove, b: ChessMove) => a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);

/**
 * Pure move: plays `seat`'s move, `spentMs` after their turn began (by the server's clock), which comes off their clock
 * before the increment goes on; returns a new state, never mutates the input. A move made after the time ran out loses
 * on time instead.
 */
export function applyMove(state: ChessState, seat: Seat, move: ChessMove, spentMs = 0): MoveResult<ChessState> {
  if (isGameOver(state)) return { ok: false, error: "GAME_OVER" };
  if (state.turn !== seat) return { ok: false, error: "NOT_YOUR_TURN" };
  if (spentMs >= turnTimeMs(state)) return { ok: true, state: expire(state) };
  if (!legalMoves(state).some((legal) => sameMove(legal, move))) return { ok: false, error: "INVALID_MOVE" };

  const piece = state.squares[move.from]!;
  const { squares, captured, castle } = playOnBoard(state.squares, move, state.enPassant);
  const next = otherSeat(seat);
  const castling = castlingAfter(state.castling, state.squares, move.from, move.to);
  const enPassant = piece.kind === "pawn" && Math.abs(rowOf(move.to) - rowOf(move.from)) === 2 ? squareAt((rowOf(move.from) + rowOf(move.to)) / 2, columnOf(move.from)) : null;
  const clocks: [number, number] = [...state.clocks];
  // The move's time comes off the mover's clock, then the increment goes on.
  clocks[seat] = Math.max(0, clocks[seat] - spentMs) + incrementMs;
  const check = inCheck(squares, next);
  const lastMove: PlayedMove = { from: move.from, to: move.to, seat, kind: piece.kind, captured, promotion: move.promotion ?? null, castle, check };
  const plies = state.plies + 1;
  const base = { ...state, squares, turn: next, castling, enPassant, clocks, lastMove, plies };

  if (legalMovesOn(squares, next, castling[next], enPassant).length === 0) {
    return { ok: true, state: check ? { ...base, winner: seat, winReason: "checkmate" } : { ...base, isDraw: true, drawReason: "stalemate" } };
  }
  // A capture or a pawn moving can never be undone, so the counts start again there.
  const progress = captured !== null || piece.kind === "pawn";
  const quietPlies = progress ? 0 : state.quietPlies + 1;
  const key = positionKey(squares, next, castling, enPassant);
  const history = progress ? [key] : [...state.history, key];
  const drawReason: DrawReason | null = insufficientMaterial(squares)
    ? "material"
    : history.filter((seen) => seen === key).length >= repetitions
      ? "repetition"
      : quietPlies >= quietMovesEach * 2
        ? "quiet"
        : null;
  return { ok: true, state: { ...base, quietPlies, history, isDraw: drawReason !== null, drawReason } };
}

/** The first legal move in the board's reading order. Never played in a real game (time running out loses, `expire`); the platform asks every game for one. */
export function firstLegalMove(state: ChessState): ChessMove {
  return legalMoves(state)[0] ?? { from: 0, to: 0 };
}

/** Reads an untrusted move from the wire: two squares on the board and, for a promotion, what the pawn becomes; or null. */
export function parseMove(raw: unknown): ChessMove | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { from, to, promotion } = raw as { from?: unknown; to?: unknown; promotion?: unknown };
  const onBoard = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < SQUARE_COUNT;
  if (!onBoard(from) || !onBoard(to)) return null;
  if (promotion === undefined) return { from, to };
  if (!PROMOTION_KINDS.includes(promotion as PromotionKind)) return null;
  return { from, to, promotion: promotion as PromotionKind };
}

/** The mover's clock as it stands `spentMs` into their turn (the other's doesn't run). */
export function clockLeft(state: ChessState, seat: Seat, spentMs: number): number {
  return seat === state.turn && !isGameOver(state) ? Math.max(0, state.clocks[seat] - spentMs) : state.clocks[seat];
}
