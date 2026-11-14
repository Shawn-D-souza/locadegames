import { loadedDie } from "../dice";
import type { MoveError, MoveResult, PartyPlace } from "../types";
import { jumpFrom } from "./board";
import { SNAKESLADDERS_CONFIG } from "./config";
import type { RollKind, SnakesLaddersState, SnakesRoll, SnakesSeat } from "./types";

/**
 * Snakes & Ladders rules, pure and deterministic given each roll's die (the server rolls it from a fresh random
 * number), so the server and every phone agree. One player at a time (owner decisions): your first roll moves you onto
 * the board; a 6 rolls again, but three 6s in a row cancel the whole turn and put you back where it began; you must
 * reach the last square exactly (a roll that would go past it doesn't move you); landing on someone does nothing. The
 * game goes on until everyone but one has finished, so everyone gets a place.
 */

export function createGame(players: number): SnakesLaddersState {
  return {
    positions: Array<number>(players).fill(0),
    turn: 0,
    moves: 0,
    sixes: 0,
    turnFrom: 0,
    finishOrder: [],
    quitOrder: [],
    lastRoll: null,
    over: false,
  };
}

export function seatCount(state: SnakesLaddersState): number {
  return state.positions.length;
}

export function hasQuit(state: SnakesLaddersState, seat: SnakesSeat): boolean {
  return state.quitOrder.includes(seat);
}

export function hasFinished(state: SnakesLaddersState, seat: SnakesSeat): boolean {
  return state.finishOrder.includes(seat);
}

/** Still racing: not finished, not quit. */
export function isIn(state: SnakesLaddersState, seat: SnakesSeat): boolean {
  return !hasFinished(state, seat) && !hasQuit(state, seat);
}

/** A roll as the wire carries it: `"roll"`; or, only on a dev server with loaded dice (playtests), `{ die }`. */
export interface RollMove {
  /** The die asked for (loaded dice), or null for the server's own random roll. */
  die: number | null;
}

/** Validates an untrusted move from the wire. `loadedDice`: a dev server that lets playtests choose the die. */
export function parseMove(raw: unknown, loadedDice = false): RollMove | null {
  if (raw === "roll") return { die: null };
  const die = loadedDie(raw, loadedDice);
  return die === null ? null : { die };
}

/** What a die does for a piece on `from` in a turn that began on `turnFrom` with `sixes` 6s rolled before it. */
export function rollFrom(seat: SnakesSeat, from: number, die: number, sixes: number, turnFrom: number): SnakesRoll {
  const { finish, sixesLimit } = SNAKESLADDERS_CONFIG;
  const roll = (kind: RollKind, landed: number, to: number): SnakesRoll => ({
    seat,
    die,
    from,
    landed,
    to,
    kind,
    again: die === 6 && kind !== "threeSixes" && to !== finish,
    finished: to === finish,
  });
  if (die === 6 && sixes + 1 >= sixesLimit) return roll("threeSixes", from, turnFrom);
  if (from + die > finish) return roll("stuck", from, from);
  const landed = from + die;
  const to = jumpFrom(landed);
  return roll(to > landed ? "ladder" : to < landed ? "snake" : "move", landed, to);
}

/** The next seat still racing after `from`, going round; null if nobody else is. */
function nextInSeat(state: SnakesLaddersState, from: SnakesSeat): SnakesSeat | null {
  const count = seatCount(state);
  for (let step = 1; step <= count; step++) {
    const seat = (from + step) % count;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Ends the game once one player (or nobody) is still racing; otherwise hands the turn on if its player is done. */
function settle(state: SnakesLaddersState, passTurn: boolean): SnakesLaddersState {
  const racing = state.positions.filter((_, seat) => isIn(state, seat)).length;
  if (racing <= 1) return { ...state, over: true, turn: -1, sixes: 0 };
  if (!passTurn) return state;
  const next = nextInSeat(state, state.turn)!;
  return { ...state, turn: next, sixes: 0, turnFrom: state.positions[next]! };
}

export function applyMove(state: SnakesLaddersState, seat: SnakesSeat, die: number): MoveResult<SnakesLaddersState> {
  const error = moveError(state, seat, die);
  if (error) return { ok: false, error };
  const roll = rollFrom(seat, state.positions[seat]!, die, state.sixes, state.turnFrom);
  const positions = state.positions.map((square, other) => (other === seat ? roll.to : square));
  const finishOrder = roll.finished ? [...state.finishOrder, seat] : state.finishOrder;
  const sixes = roll.again ? state.sixes + 1 : 0;
  const next: SnakesLaddersState = { ...state, positions, finishOrder, sixes, moves: state.moves + 1, lastRoll: roll };
  return { ok: true, state: settle(next, !roll.again) };
}

function moveError(state: SnakesLaddersState, seat: SnakesSeat, die: number): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  return Number.isInteger(die) && die >= 1 && die <= 6 ? null : "INVALID_MOVE";
}

/** `seat` quit (✕, or left the room): out now, their piece leaves the board; on their turn, it passes on. */
export function quitSeat(state: SnakesLaddersState, seat: SnakesSeat): SnakesLaddersState {
  if (state.over || !isIn(state, seat)) return state;
  const next: SnakesLaddersState = { ...state, quitOrder: [...state.quitOrder, seat] };
  return settle(next, state.turn === seat);
}

/**
 * The final order: everyone in the order they finished, then whoever was still racing, then those who quit, the
 * latest quit first. One player at a time, so nobody shares a place.
 */
export function finalPlaces(state: SnakesLaddersState): PartyPlace[] {
  const racing = state.positions.flatMap((_, seat) => (isIn(state, seat) ? [seat] : []));
  const order = [...state.finishOrder, ...racing, ...[...state.quitOrder].reverse()];
  return order.map((seat, index) => ({ seat, place: index + 1, quit: hasQuit(state, seat) }));
}
