import type { MoveError, MoveResult, PartyPlace } from "../types";
import { POOL_CONFIG } from "./config";
import { simulate } from "./physics";
import { blackSpot, freeSpot, rack } from "./rack";
import type { PoolBall, PoolFoul, PoolSeat, PoolShot, PoolShotResult, PoolState } from "./types";

/**
 * Pool's rules (owner decisions), pure: 8-ball for 2–4, everyone's balls in their own color. Clear yours, then sink the
 * black to win; the black in early (or on a foul) puts you out at once. The cue ball must touch one of your own balls
 * first (the black once yours are gone; any ball on the break). One of yours in and no foul: shoot again. A foul
 * (scratch, no ball touched, someone else's touched first) just passes the turn; a scratched cue ball goes back where
 * it was. Running out of time passes the turn too, but too many turns in a row puts you out. The game ends when someone
 * wins or only one is left in.
 */

export const CUE = 0;
export const BLACK = 1;

export function createGame(players: number, seed = 0): PoolState {
  return { balls: rack(players, seed), players, turn: 0, moves: 0, broken: false, outOrder: [], quitOrder: [], missed: Array<number>(players).fill(0), winner: null, over: false, last: null };
}

export const hasQuit = (state: PoolState, seat: PoolSeat) => state.quitOrder.includes(seat);
export const isOut = (state: PoolState, seat: PoolSeat) => state.outOrder.includes(seat);

/** Still playing: not out, not quit (and the game not over). */
export function isIn(state: PoolState, seat: PoolSeat): boolean {
  return !state.over && !isOut(state, seat) && !hasQuit(state, seat);
}

/** How many of `seat`'s balls are still on the table. */
export function ballsLeft(state: PoolState, seat: PoolSeat): number {
  return state.balls.filter((b) => b.on && b.owner === seat).length;
}

/** What `seat` must touch first now: their own balls, or the black once theirs are all down. */
export const onTheBlack = (state: PoolState, seat: PoolSeat) => ballsLeft(state, seat) === 0;

/**
 * A shot as the wire carries it, `{ dx, dy, power }`: any direction (made a unit vector here, so every phone plays the
 * very numbers the server stored), power 0 … 1 (a touch is still a shot). On a dev server only, `table` may first put
 * the balls where a playtest wants them (`[x, y, on]` per ball), so it reaches its moments at once.
 */
export interface PoolMove {
  shot: PoolShot;
  table: [number, number, boolean][] | null;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseMove(raw: unknown, loadedTable = false): PoolMove | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { dx, dy, power } = raw as Record<string, unknown>;
  if (!isNumber(dx) || !isNumber(dy) || !isNumber(power) || Math.abs(dx) > 1e6 || Math.abs(dy) > 1e6) return null;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1e-6 || power <= 0 || power > 1) return null;
  const shot = { dx: dx / length, dy: dy / length, power: Math.max(POOL_CONFIG.physics.minPower, power) };
  return { shot, table: loadedTable ? parseTable((raw as Record<string, unknown>).table) : null };
}

function parseTable(raw: unknown): PoolMove["table"] {
  if (!Array.isArray(raw)) return null;
  const ok = raw.every((b) => Array.isArray(b) && b.length === 3 && isNumber(b[0]) && isNumber(b[1]) && typeof b[2] === "boolean");
  return ok ? (raw as [number, number, boolean][]) : null;
}

/** The next seat still in after `from`, going round; null if nobody is. */
function nextInSeat(state: PoolState, from: PoolSeat): PoolSeat | null {
  for (let step = 1; step <= state.players; step++) {
    const seat = (from + step) % state.players;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** `seat`'s balls leave the table (they're out, or quit). */
const withoutBallsOf = (balls: readonly PoolBall[], seat: PoolSeat) => balls.map((b) => (b.owner === seat ? { ...b, on: false } : b));

/** The game ends once someone has won or only one player (or nobody) is left in; otherwise the turn passes on if asked. */
function settle(state: PoolState, passTurn: boolean): PoolState {
  if (state.winner !== null) return { ...state, over: true, turn: -1 };
  const left = Array.from({ length: state.players }, (_, seat) => seat).filter((seat) => isIn(state, seat));
  if (left.length <= 1) return { ...state, over: true, turn: -1, winner: left[0] ?? null };
  if (!passTurn) return state;
  return { ...state, turn: nextInSeat(state, state.turn)! };
}

/** Why a shot by `seat` was a foul, if it was: `target` is what they had to touch first. */
function foulOf(result: { firstHit: number | null; potted: number[] }, balls: readonly PoolBall[], target: "own" | "black", seat: PoolSeat, breakShot: boolean): PoolFoul | null {
  if (result.potted.includes(CUE)) return "scratch";
  if (result.firstHit === null) return "noHit";
  if (breakShot) return null;
  const owner = balls[result.firstHit]!.owner;
  return (target === "own" ? owner === seat : owner === "black") ? null : "wrongBall";
}

/** `seat` takes `shot`: the balls roll, then the rules decide what it did. */
function takeShot(state: PoolState, seat: PoolSeat, shot: PoolShot): PoolState {
  const before = state.balls;
  const target = onTheBlack(state, seat) ? "black" : "own";
  const breakShot = !state.broken;
  const { balls: rolled, outcome } = simulate(before, shot);
  const foul = foulOf(outcome, before, target, seat, breakShot);
  const blackDown = outcome.potted.includes(BLACK);
  const won = blackDown && target === "black" && foul === null;
  const out = blackDown && !won;
  const again = !foul && !blackDown && outcome.potted.some((i) => before[i]!.owner === seat);

  let balls = rolled;
  if (out) balls = withoutBallsOf(balls, seat);
  // A black sunk early goes back on its spot; a scratched cue ball where it was before the shot.
  if (out) balls = balls.map((b, i) => (i === BLACK ? { ...b, ...blackSpot(balls), on: true } : b));
  if (outcome.potted.includes(CUE)) balls = balls.map((b, i) => (i === CUE ? { ...b, ...freeSpot(balls, CUE, before[CUE]!.x, before[CUE]!.y), on: true } : b));

  const last: PoolShotResult = { kind: "shot", seat, shot, before, breakShot, ...outcome, foul, out, won, again };
  const next: PoolState = {
    ...state,
    balls,
    broken: true,
    moves: state.moves + 1,
    outOrder: out ? [...state.outOrder, seat] : state.outOrder,
    missed: state.missed.map((m, s) => (s === seat ? 0 : m)),
    winner: won ? seat : null,
    last,
  };
  return settle(next, !again);
}

function moveError(state: PoolState, seat: PoolSeat): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  return null;
}

/** `seat` plays `move`: on a dev server, first putting the balls where a playtest asked. */
export function applyMove(state: PoolState, seat: PoolSeat, move: PoolMove): MoveResult<PoolState> {
  const error = moveError(state, seat);
  if (error) return { ok: false, error };
  const table = move.table;
  if (table && table.length !== state.balls.length) return { ok: false, error: "INVALID_MOVE" };
  const arranged = table ? { ...state, balls: state.balls.map((b, i) => ({ ...b, x: table[i]![0], y: table[i]![1], on: table[i]![2] })) } : state;
  return { ok: true, state: takeShot(arranged, seat, move.shot) };
}

/**
 * The turn ran out: it passes to the next player, no foul (owner decision). The `missedTurnsOut`th in a row puts them
 * out as if they'd quit (owner decision: so nobody away or stalling keeps a game going forever).
 */
export function expire(state: PoolState): MoveResult<PoolState> {
  if (state.over) return { ok: false, error: "GAME_OVER" };
  const seat = state.turn;
  const missed = state.missed[seat]! + 1;
  const out = missed >= POOL_CONFIG.missedTurnsOut;
  const timedOut: PoolState = {
    ...state,
    moves: state.moves + 1,
    missed: state.missed.map((m, s) => (s === seat ? missed : m)),
    last: { kind: "timeout", seat, missed, out },
  };
  if (out) return { ok: true, state: quitSeat(timedOut, seat) };
  return { ok: true, state: settle(timedOut, true) };
}

/** `seat` quit (✕, or left the room): out now, their balls leave the table; on their turn, it passes on. */
export function quitSeat(state: PoolState, seat: PoolSeat): PoolState {
  if (!isIn(state, seat)) return state;
  const next: PoolState = { ...state, balls: withoutBallsOf(state.balls, seat), quitOrder: [...state.quitOrder, seat] };
  return settle(next, state.turn === seat);
}

/**
 * The final order (owner decision: the game ends with the winner): the winner, then whoever was still in, fewest balls
 * left first (level players share a place), then those out by the black, the latest first, then those who quit, the
 * latest first.
 */
export function finalPlaces(state: PoolState): PartyPlace[] {
  const seats = Array.from({ length: state.players }, (_, seat) => seat);
  const stillIn = seats.filter((s) => s !== state.winner && !isOut(state, s) && !hasQuit(state, s)).sort((a, b) => ballsLeft(state, a) - ballsLeft(state, b));
  const places: PartyPlace[] = state.winner === null ? [] : [{ seat: state.winner, place: 1, quit: false }];
  stillIn.forEach((seat, i) => {
    const level = i > 0 && ballsLeft(state, stillIn[i - 1]!) === ballsLeft(state, seat);
    places.push({ seat, place: level ? places.at(-1)!.place : places.length + 1, quit: false });
  });
  for (const seat of [...state.outOrder].reverse()) places.push({ seat, place: places.length + 1, quit: false });
  for (const seat of [...state.quitOrder].reverse()) places.push({ seat, place: places.length + 1, quit: true });
  return places;
}
