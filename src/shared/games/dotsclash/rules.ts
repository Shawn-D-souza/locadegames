import type { MoveError, MoveResult, PartyPlace } from "../types";
import { neighbours } from "./board";
import { boardSizeFor, DOTSCLASH_CONFIG } from "./config";
import type { DotsClashState, DotsSeat } from "./types";

/**
 * Dots Clash rules, pure and deterministic, so the server and every phone agree. Everyone picks a starting cell at the
 * same time, in secret (1 dot each, all revealed together, nothing explodes; the same cell for two: they pick again);
 * then, turn by turn, you add a dot to one of your own cells. A cell reaching 4
 * explodes: it sends one dot to each of its 4 neighbours (the board wraps) and they become yours, dots and all, which
 * can set off more explosions, wave after wave. No cells left: you're out. The last player with cells wins.
 */

/** The board as it stands at one moment of a chain, and the cells about to explode from it. */
export interface ChainFrame {
  owners: (DotsSeat | null)[];
  dots: number[];
  bursting: number[];
}

/** Where a pick sits in the room view: hidden, only that it was made. */
export const HIDDEN_PICK = -1;

export function createGame(players: number): DotsClashState {
  const size = boardSizeFor(players);
  return {
    size,
    owners: Array<DotsSeat | null>(size * size).fill(null),
    dots: Array<number>(size * size).fill(0),
    phase: "pick",
    turn: -1,
    moves: 0,
    picks: Array<number | null>(players).fill(null),
    clashed: Array<boolean>(players).fill(false),
    exits: 0,
    outAt: Array<number | null>(players).fill(null),
    quit: Array<boolean>(players).fill(false),
    lastMove: null,
    winner: null,
    over: false,
  };
}

export function seatCount(state: DotsClashState): number {
  return state.quit.length;
}

/** Still playing: not out, not quit. */
export function isIn(state: DotsClashState, seat: DotsSeat): boolean {
  return state.outAt[seat] === null && !state.quit[seat];
}

export function cellsOf(state: Pick<DotsClashState, "owners">, seat: DotsSeat): number {
  return state.owners.reduce<number>((sum, owner) => sum + (owner === seat ? 1 : 0), 0);
}

/** A cell `seat` may tap now: any cell while they still have to pick, one of their own on their turn. */
export function canTap(state: DotsClashState, seat: DotsSeat, cell: number): boolean {
  return moveError(state, seat, cell) === null;
}

/** The game as everyone may see it: where each pick is stays secret until all are in. */
export function hidePicks(state: DotsClashState): DotsClashState {
  return { ...state, picks: state.picks.map((pick) => (pick === null ? null : HIDDEN_PICK)) };
}

/** Validates an untrusted move from the wire: a cell index. */
export function parseMove(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < 1024 ? raw : null;
}

/**
 * One dot on `cell` (owned by `seat`), then the chain: every full cell explodes at once, wave after wave, until none is
 * full or nobody but `seat` is left. Calls `onFrame` with the board before each wave (and the cells about to burst).
 */
export function resolveTap(
  state: DotsClashState,
  seat: DotsSeat,
  cell: number,
  onFrame?: (frame: ChainFrame) => void,
): { owners: (DotsSeat | null)[]; dots: number[]; waves: number } {
  const owners = [...state.owners];
  const dots = [...state.dots];
  owners[cell] = seat;
  dots[cell] = (dots[cell] ?? 0) + 1;
  const othersHaveCells = () => owners.some((owner) => owner !== null && owner !== seat && isIn(state, owner));
  let waves = 0;
  for (; waves < DOTSCLASH_CONFIG.maxWaves; waves++) {
    const bursting = dots.flatMap((count, index) => (count >= DOTSCLASH_CONFIG.burstAt ? [index] : []));
    if (bursting.length === 0 || !othersHaveCells()) break;
    onFrame?.({ owners: [...owners], dots: [...dots], bursting });
    // Every burst is worked out from the same board, then lands together: no cell goes first.
    const incoming = new Map<number, DotsSeat>();
    const added = Array<number>(dots.length).fill(0);
    for (const from of bursting) {
      dots[from]! -= DOTSCLASH_CONFIG.burstAt;
      for (const to of neighbours(state.size, from)) {
        added[to]! += 1;
        incoming.set(to, owners[from]!);
      }
    }
    for (let index = 0; index < dots.length; index++) {
      dots[index]! += added[index]!;
      const taker = incoming.get(index);
      if (taker !== undefined) owners[index] = taker;
      else if (dots[index] === 0) owners[index] = null;
    }
  }
  onFrame?.({ owners: [...owners], dots: [...dots], bursting: [] });
  return { owners, dots, waves };
}

/** Every frame of a tap's chain, from the dot landing to the board at rest: what phones animate. */
export function chainFrames(state: DotsClashState, seat: DotsSeat, cell: number): ChainFrame[] {
  const frames: ChainFrame[] = [];
  resolveTap(state, seat, cell, (frame) => frames.push(frame));
  return frames;
}

/** The next seat still in after `from`, going round; null if nobody else is. */
function nextInSeat(state: DotsClashState, from: DotsSeat): DotsSeat | null {
  const count = seatCount(state);
  for (let step = 1; step <= count; step++) {
    const seat = (from + step) % count;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Ends the game if one player (or nobody) is left. */
function settle(state: DotsClashState): DotsClashState {
  const left = state.quit.map((_, seat) => seat).filter((seat) => isIn(state, seat));
  if (left.length > 1) return state;
  return { ...state, over: true, turn: -1, winner: left[0] ?? null };
}

/**
 * Once everyone still in has picked: two or more on the same cell pick again (the others' picks stay, still secret);
 * otherwise every start is revealed at once, 1 dot each, and the first player still in takes the first turn.
 */
function settlePicks(state: DotsClashState): DotsClashState {
  const seats = state.quit.map((_, seat) => seat).filter((seat) => isIn(state, seat));
  if (state.over || state.phase !== "pick" || seats.some((seat) => state.picks[seat] === null)) return state;
  const chosen = (seat: DotsSeat) => seats.filter((other) => state.picks[other] === state.picks[seat]).length;
  const clashed = state.picks.map((_, seat) => seats.includes(seat) && chosen(seat) > 1);
  const moves = state.moves + 1;
  if (clashed.includes(true)) return { ...state, moves, clashed, picks: state.picks.map((pick, seat) => (clashed[seat] ? null : pick)) };
  const owners = [...state.owners];
  const dots = [...state.dots];
  for (const seat of seats) {
    owners[state.picks[seat]!] = seat;
    dots[state.picks[seat]!] = DOTSCLASH_CONFIG.startDots;
  }
  const none = state.picks.map(() => null);
  return { ...state, owners, dots, moves, phase: "play", turn: seats[0]!, picks: none, clashed: clashed.map(() => false), lastMove: null };
}

/** Hands the turn on to the next player still in. */
function passTurn(state: DotsClashState): DotsClashState {
  if (state.over || state.phase === "pick") return state;
  const next = nextInSeat(state, state.turn);
  if (next === null) return state;
  return { ...state, turn: next };
}

export function applyMove(state: DotsClashState, seat: DotsSeat, cell: number): MoveResult<DotsClashState> {
  const error = moveError(state, seat, cell);
  if (error) return { ok: false, error };
  if (state.phase === "pick") return { ok: true, state: settlePicks({ ...state, picks: state.picks.map((pick, other) => (other === seat ? cell : pick)) }) };
  const moves = state.moves + 1;
  const { owners, dots, waves } = resolveTap(state, seat, cell);
  // Anyone left without a cell is out, together if the same chain took them.
  const knocked = state.outAt.map((at, other) => at === null && !state.quit[other] && !owners.includes(other));
  const exits = knocked.includes(true) ? state.exits + 1 : state.exits;
  const outAt = state.outAt.map((at, other) => (knocked[other] ? exits : at));
  const next = settle({ ...state, owners, dots, moves, exits, outAt, lastMove: { seat, cell, waves } });
  return { ok: true, state: passTurn(next) };
}

function moveError(state: DotsClashState, seat: DotsSeat, cell: number): MoveError | null {
  if (state.over) return "GAME_OVER";
  // Picking, everyone at once: each player in picks once.
  const yours = state.phase === "pick" ? isIn(state, seat) && state.picks[seat] === null : state.turn === seat;
  if (!yours) return "NOT_YOUR_TURN";
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.owners.length) return "INVALID_MOVE";
  return state.phase === "pick" || state.owners[cell] === seat ? null : "INVALID_MOVE";
}

/** Played when a turn runs out; deterministic, no luck: your cell with the most dots (ties: the first in reading order). */
export function autoMove(state: DotsClashState): number {
  let best = -1;
  state.owners.forEach((owner, cell) => {
    if (owner === state.turn && (best === -1 || state.dots[cell]! > state.dots[best]!)) best = cell;
  });
  return best;
}

/** A 32-bit mix of a seed and a number. */
function mix(seed: number, n: number): number {
  let x = (seed ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * The picks ran out of time: everyone still in who hasn't picked gets a cell picked for them from `seed` (the server's
 * fresh random number, so no phone can work it out ahead), never one already picked, and the picks settle.
 */
export function autoPicks(state: DotsClashState, seed: number): DotsClashState {
  if (state.phase !== "pick") return state;
  const picks = [...state.picks];
  state.picks.forEach((pick, seat) => {
    if (pick !== null || !isIn(state, seat)) return;
    const free = state.owners.map((_, cell) => cell).filter((cell) => !picks.includes(cell));
    picks[seat] = free[mix(seed, seat) % free.length]!;
  });
  return settlePicks({ ...state, picks });
}

/** `seat` quit (✕, or left the room): out now, their cells stay on the board, grey, for any explosion to take. */
export function quitSeat(state: DotsClashState, seat: DotsSeat): DotsClashState {
  if (state.over || !isIn(state, seat)) return state;
  const quit = state.quit.map((q, other) => q || other === seat);
  const exits = state.exits + 1;
  const outAt = state.outAt.map((at, other) => (other === seat ? exits : at));
  const picks = state.picks.map((pick, other) => (other === seat ? null : pick));
  const next = settle({ ...state, quit, exits, outAt, picks });
  // Picking: they may have been the last one everyone was waiting for.
  return state.phase === "pick" ? settlePicks(next) : state.turn === seat ? passTurn(next) : next;
}

/** The final order: the last player standing, then everyone by how long they lasted (later out ranks higher). */
export function finalPlaces(state: DotsClashState): PartyPlace[] {
  const lasted = (seat: DotsSeat) => state.outAt[seat] ?? Infinity;
  const seats = state.quit.map((_, seat) => seat).sort((a, b) => lasted(b) - lasted(a) || a - b);
  return seats.map((seat) => ({
    seat,
    place: 1 + seats.filter((other) => lasted(other) > lasted(seat)).length,
    quit: state.quit[seat]!,
  }));
}
