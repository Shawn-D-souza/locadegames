import { loadedDie } from "../dice";
import type { MoveError, MoveResult, PartyPlace } from "../types";
import { armOf, boardFor, homeProgress, isSafe, trackSquare, type LudoBoard } from "./board";
import { LUDO_CONFIG } from "./config";
import type { LudoAction, LudoCapture, LudoSeat, LudoState, LudoStep } from "./types";

/**
 * Ludo's rules, pure and deterministic given each die (the server rolls it from a fresh random number), so the server
 * and every phone agree. Classic Ludo (owner decisions): 4 pawns each; only a 6 brings a pawn out of its base; a 6, a
 * capture or a pawn getting home rolls again, but the third 6 in a row ends the turn unplayed; landing on someone else's
 * pawn off a safe square sends it back to its base; no blocks (pawns share squares); a pawn needs the exact roll to get
 * home. A turn is a roll, then, when more than one pawn can move, a pick. The game goes on until everyone but one has
 * all four pawns home, so everyone gets a place.
 */

export function createGame(players: number): LudoState {
  return {
    pawns: Array.from({ length: players }, () => Array<number>(LUDO_CONFIG.pawns).fill(-1)),
    turn: 0,
    moves: 0,
    sixes: 0,
    die: null,
    finishOrder: [],
    quitOrder: [],
    last: null,
    over: false,
  };
}

export const seatCount = (state: LudoState) => state.pawns.length;
export const boardOf = (state: LudoState): LudoBoard => boardFor(seatCount(state));
export const hasQuit = (state: LudoState, seat: LudoSeat) => state.quitOrder.includes(seat);
export const hasFinished = (state: LudoState, seat: LudoSeat) => state.finishOrder.includes(seat);

/** Still racing: not finished, not quit. */
export function isIn(state: LudoState, seat: LudoSeat): boolean {
  return !hasFinished(state, seat) && !hasQuit(state, seat);
}

/** A move as the wire carries it: `"roll"`, `{ pawn }` (which pawn to move with the die rolled), or on a dev server only, `{ die }`. */
export type LudoMove = { kind: "roll"; die: number | null } | { kind: "pick"; pawn: number };

/** Validates an untrusted move from the wire. `loadedDice`: a dev server that lets playtests choose the die. */
export function parseMove(raw: unknown, loadedDice = false): LudoMove | null {
  if (raw === "roll") return { kind: "roll", die: null };
  if (typeof raw === "object" && raw !== null && "pawn" in raw) {
    const pawn = raw.pawn;
    return typeof pawn === "number" && Number.isInteger(pawn) && pawn >= 0 && pawn < LUDO_CONFIG.pawns ? { kind: "pick", pawn } : null;
  }
  const die = loadedDie(raw, loadedDice);
  return die === null ? null : { kind: "roll", die };
}

/** Where pawn `pawn` of `seat` would go with `die`, or null if it can't move (in its base without a 6, or past home). */
export function destination(state: LudoState, seat: LudoSeat, pawn: number, die: number): number | null {
  const from = state.pawns[seat]![pawn]!;
  if (from < 0) return die === LUDO_CONFIG.enterDie ? 0 : null;
  return from + die <= homeProgress(boardOf(state)) && from < homeProgress(boardOf(state)) ? from + die : null;
}

/** The pawns of `seat` that can move with `die`. */
export function movablePawns(state: LudoState, seat: LudoSeat, die: number): number[] {
  return state.pawns[seat]!.flatMap((_, pawn) => (destination(state, seat, pawn, die) === null ? [] : [pawn]));
}

/** Everyone else's pawns a pawn of `seat` landing on `progress` would capture (none on a safe square or off the track). */
function capturesAt(state: LudoState, seat: LudoSeat, progress: number): LudoCapture[] {
  const board = boardOf(state);
  const players = seatCount(state);
  const square = trackSquare(board, armOf(board, seat, players), progress);
  if (square === null || isSafe(board, square)) return [];
  return state.pawns.flatMap((pawns, other) =>
    other === seat || hasQuit(state, other)
      ? []
      : pawns.flatMap((at, pawn) => (trackSquare(board, armOf(board, other, players), at) === square ? [{ seat: other, pawn, from: at }] : [])),
  );
}

/**
 * The pawn the server moves when time runs out (a fixed rule, and a fair one for whoever is away): one that gets home,
 * else one that captures, else one out of its base, else the one furthest along; ties to the first pawn.
 */
export function autoPawn(state: LudoState, seat: LudoSeat, die: number): number {
  const home = homeProgress(boardOf(state));
  const score = (pawn: number) => {
    const to = destination(state, seat, pawn, die)!;
    if (to === home) return 4 * home;
    if (capturesAt(state, seat, to).length > 0) return 3 * home;
    if (state.pawns[seat]![pawn]! < 0) return 2 * home;
    return to;
  };
  return movablePawns(state, seat, die).reduce((best, pawn) => (score(pawn) > score(best) ? pawn : best));
}

/** The next seat still racing after `from`, going round; null if nobody else is. */
function nextInSeat(state: LudoState, from: LudoSeat): LudoSeat | null {
  const count = seatCount(state);
  for (let step = 1; step <= count; step++) {
    const seat = (from + step) % count;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Ends the game once one player (or nobody) is still racing; otherwise hands the turn on if its player is done. */
function settle(state: LudoState, passTurn: boolean): LudoState {
  const racing = state.pawns.filter((_, seat) => isIn(state, seat)).length;
  if (racing <= 1) return { ...state, over: true, turn: -1, sixes: 0, die: null };
  if (!passTurn) return state;
  return { ...state, turn: nextInSeat(state, state.turn)!, sixes: 0, die: null };
}

/** `seat` moves `pawn` with `die`: it lands, captures, maybe gets home; then they roll again or the turn passes. */
function movePawn(state: LudoState, seat: LudoSeat, pawn: number, die: number, rolled: boolean): LudoState {
  const from = state.pawns[seat]![pawn]!;
  const to = destination(state, seat, pawn, die)!;
  const captured = capturesAt(state, seat, to);
  const step: LudoStep = { pawn, from, to, captured };
  const pawns = state.pawns.map((mine, s) =>
    mine.map((at, p) => (s === seat && p === pawn ? to : captured.some((c) => c.seat === s && c.pawn === p) ? -1 : at)),
  );
  const home = homeProgress(boardOf(state));
  const finished = pawns[seat]!.every((at) => at === home);
  const again = !finished && (die === 6 || captured.length > 0 || to === home);
  const finishOrder = finished ? [...state.finishOrder, seat] : state.finishOrder;
  const last: LudoAction = { seat, die, rolled, outcome: "moved", step, again, finished };
  const sixes = again && die === 6 ? state.sixes + 1 : 0;
  return settle({ ...state, pawns, finishOrder, sixes, die: null, moves: state.moves + 1, last }, !again);
}

/** `seat` rolls `die`. With `autoPick` (time ran out), a choice is made for them at once by the fixed rule. */
function rollDie(state: LudoState, seat: LudoSeat, die: number, autoPick: boolean): LudoState {
  const action = (outcome: LudoAction["outcome"], again: boolean): LudoAction => ({ seat, die, rolled: true, outcome, step: null, again, finished: false });
  const moves = state.moves + 1;
  if (die === 6 && state.sixes + 1 >= LUDO_CONFIG.sixesLimit) return settle({ ...state, moves, last: action("threeSixes", false) }, true);
  // The roller picks whenever more than one pawn can move (owner decision: even all in the base, or standing together).
  const choices = movablePawns(state, seat, die);
  if (choices.length === 0) {
    const again = die === 6;
    return settle({ ...state, moves, sixes: again ? state.sixes + 1 : 0, last: action("noMove", again) }, !again);
  }
  if (choices.length === 1 || autoPick) return movePawn(state, seat, autoPick ? autoPawn(state, seat, die) : choices[0]!, die, true);
  return { ...state, moves, die, last: action("choose", false) };
}

function moveError(state: LudoState, seat: LudoSeat, move: LudoMove, die: number | null): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  if (move.kind === "roll") return state.die === null && die !== null && Number.isInteger(die) && die >= 1 && die <= 6 ? null : "INVALID_MOVE";
  return state.die !== null && destination(state, seat, move.pawn, state.die) !== null ? null : "INVALID_MOVE";
}

/** `seat` plays `move`; a roll uses `die` (the server's, or a loaded one on a dev server). */
export function applyMove(state: LudoState, seat: LudoSeat, move: LudoMove, die: number | null = null): MoveResult<LudoState> {
  const rolled = move.kind === "roll" ? (move.die ?? die) : state.die;
  const error = moveError(state, seat, move, rolled);
  if (error) return { ok: false, error };
  return { ok: true, state: move.kind === "roll" ? rollDie(state, seat, rolled!, false) : movePawn(state, seat, move.pawn, rolled!, false) };
}

/** The turn ran out: the server rolls for them and moves by the fixed rule, or (a roll waiting for a pick) moves by it. */
export function expire(state: LudoState, die: number): MoveResult<LudoState> {
  if (state.over) return { ok: false, error: "GAME_OVER" };
  if (state.die === null) return { ok: true, state: rollDie(state, state.turn, die, true) };
  return { ok: true, state: movePawn(state, state.turn, autoPawn(state, state.turn, state.die), state.die, false) };
}

/** `seat` quit (✕, or left the room): out now, their pawns leave the board; on their turn, it passes on. */
export function quitSeat(state: LudoState, seat: LudoSeat): LudoState {
  if (state.over || !isIn(state, seat)) return state;
  const next: LudoState = { ...state, quitOrder: [...state.quitOrder, seat] };
  return settle(next, state.turn === seat);
}

/** How far a player has come: all their pawns' progress together (who is ahead among those still racing). */
const progressOf = (state: LudoState, seat: LudoSeat) => state.pawns[seat]!.reduce((sum, at) => sum + Math.max(0, at), 0);

/**
 * The final order: everyone in the order they finished, then whoever was still racing (furthest along first), then
 * those who quit, the latest quit first. One player at a time, so nobody shares a place.
 */
export function finalPlaces(state: LudoState): PartyPlace[] {
  const racing = state.pawns.flatMap((_, seat) => (isIn(state, seat) ? [seat] : [])).sort((a, b) => progressOf(state, b) - progressOf(state, a));
  const order = [...state.finishOrder, ...racing, ...[...state.quitOrder].reverse()];
  return order.map((seat, index) => ({ seat, place: index + 1, quit: hasQuit(state, seat) }));
}
