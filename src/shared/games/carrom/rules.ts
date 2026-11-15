import type { MoveError, MoveResult, PartyPlace } from "../types";
import { centreSpot, sideFrame, sideOf, startingCoins, strikerFits } from "./board";
import { CARROM_CONFIG } from "./config";
import { simulate } from "./physics";
import type { CarromCoin, CarromSeat, CarromShot, CarromShotResult, CarromState, CoinKind, QueenNews } from "./types";

/**
 * Carrom's rules (owner decisions), pure: point carrom for 2–4, each playing for themselves. Anyone may pocket any coin:
 * a white is 20, a black 10. The queen is 50, but only once covered: a coin must go in with her or on the shot after,
 * else she goes back in the middle. A coin in and no foul: shoot again. The striker in a pocket is a foul: -10 (a score
 * may go below 0), the coins that went in with it go back, the turn passes. The game is one board: it ends once every
 * coin is in (or only one player is left in); most points wins, level players share the win.
 */

export const QUEEN = 0;

export function createGame(players: number): CarromState {
  return {
    coins: startingCoins(),
    players,
    turn: 0,
    moves: 0,
    scores: Array<number>(players).fill(0),
    queenDue: null,
    quitOrder: [],
    missed: Array<number>(players).fill(0),
    over: false,
    last: null,
  };
}

export const hasQuit = (state: CarromState, seat: CarromSeat) => state.quitOrder.includes(seat);

/** Still playing: not quit (and the game not over). */
export function isIn(state: CarromState, seat: CarromSeat): boolean {
  return !state.over && !hasQuit(state, seat);
}

/** What a coin is worth once in (the queen only once covered). */
export const coinPoints = (kind: CoinKind) => CARROM_CONFIG.points[kind];

/** Coins still on the board. */
export const coinsLeft = (state: Pick<CarromState, "coins">) => state.coins.filter((c) => c.on).length;

/**
 * A shot as the wire carries it, `{ at, dx, dy, power }`: where the striker stands on your baseline, any direction (made
 * a unit vector here, so every phone plays the very numbers the server stored), power 0 … 1 (a touch is still a shot).
 * On a dev server only, `table` may first put the coins where a playtest wants them (`[x, y, on]` per coin).
 */
export interface CarromMove {
  shot: CarromShot;
  table: [number, number, boolean][] | null;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseMove(raw: unknown, loadedTable = false): CarromMove | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { at, dx, dy, power } = raw as Record<string, unknown>;
  if (!isNumber(at) || !isNumber(dx) || !isNumber(dy) || !isNumber(power) || Math.abs(dx) > 1e6 || Math.abs(dy) > 1e6) return null;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1e-6 || power <= 0 || power > 1 || Math.abs(at) > CARROM_CONFIG.baseline.half) return null;
  const shot = { at, dx: dx / length, dy: dy / length, power: Math.max(CARROM_CONFIG.physics.minPower, power) };
  return { shot, table: loadedTable ? parseTable((raw as Record<string, unknown>).table) : null };
}

function parseTable(raw: unknown): CarromMove["table"] {
  if (!Array.isArray(raw)) return null;
  const ok = raw.every((c) => Array.isArray(c) && c.length === 3 && isNumber(c[0]) && isNumber(c[1]) && typeof c[2] === "boolean");
  return ok ? (raw as [number, number, boolean][]) : null;
}

/** Whether `shot` may be taken from `seat`'s side: the striker on its baseline, clear of the coins, flicked forward. */
export function shotAllowed(state: CarromState, seat: CarromSeat, shot: CarromShot): boolean {
  const side = sideOf(state.players, seat);
  const { forward } = sideFrame(side);
  return strikerFits(state.coins, side, shot.at) && shot.dx * forward.x + shot.dy * forward.y >= CARROM_CONFIG.forwardMin;
}

/** The next seat still in after `from`, going round; null if nobody is. */
function nextInSeat(state: CarromState, from: CarromSeat): CarromSeat | null {
  for (let step = 1; step <= state.players; step++) {
    const seat = (from + step) % state.players;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Coins `which` back in the middle, one by one (the queen first), each in the free spot nearest it. */
function putBack(coins: readonly CarromCoin[], which: readonly number[]): CarromCoin[] {
  const next = [...coins];
  for (const i of [...which].sort((a, b) => a - b)) next[i] = { ...next[i]!, ...centreSpot(next), on: true };
  return next;
}

/** The game ends once every coin is in or only one player (or nobody) is left in; otherwise the turn passes on if asked. */
function settle(state: CarromState, passTurn: boolean): CarromState {
  const left = Array.from({ length: state.players }, (_, seat) => seat).filter((seat) => isIn(state, seat));
  if (left.length <= 1 || (coinsLeft(state) === 0 && state.queenDue === null)) return { ...state, over: true, turn: -1, queenDue: null };
  if (!passTurn) return state;
  return { ...state, turn: nextInSeat(state, state.turn)! };
}

/** `seat` takes `shot`: the discs slide, then the rules decide what it did. */
function takeShot(state: CarromState, seat: CarromSeat, shot: CarromShot): CarromState {
  const before = state.coins;
  const side = sideOf(state.players, seat);
  const { coins: slid, outcome } = simulate(before, side, shot);
  const foul = outcome.strikerIn;
  const coinsIn = outcome.pocketed.filter((i) => i !== QUEEN);
  const queenIn = outcome.pocketed.includes(QUEEN);
  const covering = state.queenDue === seat;

  let points = 0;
  let queen: QueenNews = "none";
  let queenDue: CarromSeat | null = null;
  let returned: number[] = [];
  if (foul) {
    // Everything that went in with the striker goes back, and a queen waiting to be covered with it.
    points = -CARROM_CONFIG.foulPenalty;
    returned = covering ? [QUEEN, ...outcome.pocketed] : outcome.pocketed;
    if (covering || queenIn) queen = "returned";
  } else {
    points = coinsIn.reduce((sum, i) => sum + coinPoints(before[i]!.kind), 0);
    if (covering) {
      // Covered by any coin on this shot; else she goes back.
      queen = coinsIn.length > 0 ? "covered" : "returned";
      if (queen === "returned") returned = [QUEEN];
    } else if (queenIn) {
      // In with another coin, or with nothing left to cover her with: covered at once. Else: cover her next shot.
      const nothingLeft = slid.every((c) => !c.on);
      queen = coinsIn.length > 0 || nothingLeft ? "covered" : "pocketed";
      if (queen === "pocketed") queenDue = seat;
    }
    if (queen === "covered") points += coinPoints("queen");
  }
  const again = !foul && outcome.pocketed.length > 0 && queen !== "returned";

  const last: CarromShotResult = { kind: "shot", seat, side, shot, before, ...outcome, foul, points, queen, returned, again };
  const next: CarromState = {
    ...state,
    coins: putBack(slid, returned),
    moves: state.moves + 1,
    scores: state.scores.map((s, i) => (i === seat ? s + points : s)),
    queenDue,
    missed: state.missed.map((m, s) => (s === seat ? 0 : m)),
    last,
  };
  return settle(next, !again);
}

function moveError(state: CarromState, seat: CarromSeat): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  return null;
}

/** `seat` plays `move`: on a dev server, first putting the coins where a playtest asked. */
export function applyMove(state: CarromState, seat: CarromSeat, move: CarromMove): MoveResult<CarromState> {
  const error = moveError(state, seat);
  if (error) return { ok: false, error };
  const table = move.table;
  if (table && table.length !== state.coins.length) return { ok: false, error: "INVALID_MOVE" };
  const arranged = table ? { ...state, coins: state.coins.map((c, i) => ({ ...c, x: table[i]![0], y: table[i]![1], on: table[i]![2] })) } : state;
  if (!shotAllowed(arranged, seat, move.shot)) return { ok: false, error: "INVALID_MOVE" };
  return { ok: true, state: takeShot(arranged, seat, move.shot) };
}

/** A queen waiting to be covered by `seat` goes back in the middle (their turn ended without a shot: run out, or quit). */
function queenBack(state: CarromState, seat: CarromSeat): CarromState {
  if (state.queenDue !== seat) return state;
  return { ...state, coins: putBack(state.coins, [QUEEN]), queenDue: null };
}

/** The turn ran out: it passes to the next player. The `missedTurnsOut`th in a row puts them out as if they'd quit. */
export function expire(state: CarromState): MoveResult<CarromState> {
  if (state.over) return { ok: false, error: "GAME_OVER" };
  const seat = state.turn;
  const missed = state.missed[seat]! + 1;
  const out = missed >= CARROM_CONFIG.missedTurnsOut;
  const timedOut: CarromState = {
    ...queenBack(state, seat),
    moves: state.moves + 1,
    missed: state.missed.map((m, s) => (s === seat ? missed : m)),
    last: { kind: "timeout", seat, missed, out, queenReturned: state.queenDue === seat },
  };
  if (out) return { ok: true, state: quitSeat(timedOut, seat) };
  return { ok: true, state: settle(timedOut, true) };
}

/** `seat` quit (✕, or left the room): out now (the coins stay: they're everyone's); on their turn, it passes on. */
export function quitSeat(state: CarromState, seat: CarromSeat): CarromState {
  if (!isIn(state, seat)) return state;
  const next: CarromState = { ...queenBack(state, seat), quitOrder: [...state.quitOrder, seat] };
  return settle(next, state.turn === seat);
}

/** The final order: most points first (level players share a place), then those who quit, the latest first. */
export function finalPlaces(state: CarromState): PartyPlace[] {
  const seats = Array.from({ length: state.players }, (_, seat) => seat);
  const stayed = seats.filter((s) => !hasQuit(state, s)).sort((a, b) => state.scores[b]! - state.scores[a]!);
  const places: PartyPlace[] = [];
  stayed.forEach((seat, i) => {
    const level = i > 0 && state.scores[stayed[i - 1]!] === state.scores[seat];
    places.push({ seat, place: level ? places.at(-1)!.place : i + 1, quit: false, score: state.scores[seat]! });
  });
  for (const seat of [...state.quitOrder].reverse()) places.push({ seat, place: places.length + 1, quit: true, score: state.scores[seat]! });
  return places;
}

/** Who gets the room trophy: everyone in first place (level players share the win). */
export function winners(state: CarromState): CarromSeat[] {
  return finalPlaces(state).filter((p) => p.place === 1 && !p.quit).map((p) => p.seat);
}
