import type { MoveError, MoveResult, PartyPlace } from "../types";
import { gridFor, MEMORY_CONFIG } from "./config";
import { dealFace, pickFaces } from "./deal";
import type { MemorySeat, MemoryState } from "./types";

/**
 * Memory rules, pure and deterministic given the server's random numbers. Every card starts face down. On your turn
 * you turn two; a matching pair is yours and you turn two more, otherwise the turn passes on (owner's rules). Once
 * every pair is found, most pairs wins; players level on the most share the win.
 */

/**
 * A card to turn. On a dev server a playtest may say what an unturned card turns out to be (`deal`): the open card's
 * partner, or a picture nobody has seen yet (so not a match, and its own partner is still face down), so it reaches its
 * moments without luck.
 */
export interface MemoryFlip {
  card: number;
  deal: "match" | "new" | null;
}

export function createGame(players: number, seed: number): MemoryState {
  const { cols, rows } = gridFor(players);
  const faces = pickFaces((cols * rows) / 2, seed);
  return {
    cols,
    rows,
    faces,
    undealt: faces.map(() => 2),
    cards: Array<number | null>(cols * rows).fill(null),
    taken: Array<MemorySeat | null>(cols * rows).fill(null),
    open: null,
    turn: 0,
    moves: 0,
    quit: Array<boolean>(players).fill(false),
    quitOrder: [],
    lastMove: null,
    missed: Array<number>(players).fill(0),
    timeout: null,
    over: false,
  };
}

/** Still playing: hasn't quit. */
export function isIn(state: MemoryState, seat: MemorySeat): boolean {
  return !state.quit[seat];
}

/** Pairs `seat` has found. */
export function pairsOf(state: Pick<MemoryState, "taken">, seat: MemorySeat): number {
  return state.taken.reduce<number>((sum, owner) => sum + (owner === seat ? 1 : 0), 0) / 2;
}

/** Validates an untrusted move from the wire: a card number (checked against the board when played), or on a dev server a loaded one. */
export function parseMove(raw: unknown, loaded: boolean): MemoryFlip | null {
  const isCard = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 1024;
  if (isCard(raw)) return { card: raw, deal: null };
  if (!loaded || typeof raw !== "object" || raw === null || !("card" in raw) || !("deal" in raw)) return null;
  const { card, deal } = raw;
  return isCard(card) && (deal === "match" || deal === "new") ? { card, deal } : null;
}

/** A card that can be turned now: in play and not the one already face up. */
export function canTurn(state: Pick<MemoryState, "taken" | "open">, card: number): boolean {
  return card >= 0 && card < state.taken.length && state.taken[card] === null && state.open !== card;
}

function moveError(state: MemoryState, seat: MemorySeat, card: number): MoveError | null {
  if (state.over) return "GAME_OVER";
  if (state.turn !== seat) return "NOT_YOUR_TURN";
  if (!Number.isInteger(card) || card < 0 || card >= state.cards.length) return "INVALID_MOVE";
  return canTurn(state, card) ? null : "CELL_TAKEN";
}

/** The next seat still in after `from`, going round; null if nobody else is. */
function nextInSeat(state: MemoryState, from: MemorySeat): MemorySeat | null {
  const count = state.quit.length;
  for (let step = 1; step <= count; step++) {
    const seat = (from + step) % count;
    if (isIn(state, seat)) return seat;
  }
  return null;
}

/** Ends the game once every pair is found, or when fewer than two players are left. */
function settle(state: MemoryState): MemoryState {
  const left = state.quit.filter((q) => !q).length;
  if (left > 1 && state.taken.includes(null)) return state;
  return { ...state, over: true, turn: -1, open: null };
}

/** What an unturned card turns out to be: drawn from the cards not yet turned, or (a dev server's playtest) chosen. */
function faceFor(state: MemoryState, deal: MemoryFlip["deal"], seed: number): number {
  const openFace = state.open === null ? null : state.cards[state.open]!;
  if (deal === "match" && openFace !== null && state.undealt[openFace]! > 0) return openFace;
  if (deal === "new") {
    const unseen = state.undealt.map((n) => (n === 2 ? n : 0));
    if (unseen.some((n) => n > 0)) return dealFace(unseen, seed);
  }
  return dealFace(state.undealt, seed);
}

/** `seed`: the server's fresh random number, for a card turned for the first time. */
export function applyMove(state: MemoryState, seat: MemorySeat, flip: MemoryFlip, seed: number): MoveResult<MemoryState> {
  const error = moveError(state, seat, flip.card);
  if (error) return { ok: false, error };
  const { card } = flip;
  const known = state.cards[card]!;
  const face = known ?? faceFor(state, flip.deal, seed);
  const cards = state.cards.map((f, i) => (i === card ? face : f));
  const undealt = known === null ? state.undealt.map((n, f) => (f === face ? n - 1 : n)) : state.undealt;
  // Turning a card starts the count of turns run out again.
  const missed = state.missed.map((m, s) => (s === seat ? 0 : m));
  const moved = { ...state, cards, undealt, missed, timeout: null, moves: state.moves + 1 };
  if (state.open === null) {
    return { ok: true, state: { ...moved, open: card, lastMove: { seat, cards: [card], faces: [face], matched: false } } };
  }
  const first = state.open;
  const matched = cards[first] === face;
  // A pair: yours, and you turn again. Otherwise both turn back and the turn goes on to the next player still in.
  const taken = matched ? state.taken.map((owner, i) => (i === first || i === card ? seat : owner)) : state.taken;
  const turn = matched ? seat : (nextInSeat(state, seat) ?? seat);
  const lastMove = { seat, cards: [first, card], faces: [cards[first]!, face], matched };
  return { ok: true, state: settle({ ...moved, taken, turn, open: null, lastMove }) };
}

/**
 * The turn ran out: no card is turned for them (owner decision, like Pool); a card they had face up turns back and
 * the turn passes on. The `missedTurnsOut`th in a row puts them out as if they'd quit (owner decision: so nobody away
 * keeps a game going; if everyone is away, they drop out one by one and the last one left wins).
 */
export function expire(state: MemoryState): MoveResult<MemoryState> {
  if (state.over) return { ok: false, error: "GAME_OVER" };
  const seat = state.turn;
  const missed = state.missed[seat]! + 1;
  const out = missed >= MEMORY_CONFIG.missedTurnsOut;
  const timedOut: MemoryState = {
    ...state,
    moves: state.moves + 1,
    missed: state.missed.map((m, s) => (s === seat ? missed : m)),
    timeout: { seat, missed, out, card: state.open },
  };
  if (out) return { ok: true, state: quitSeat(timedOut, seat) };
  return { ok: true, state: settle({ ...timedOut, open: null, turn: nextInSeat(timedOut, seat) ?? seat }) };
}

/** `seat` quit (✕, or left the room): skipped from now on; a card they had face up turns back; their pairs stay, grey. */
export function quitSeat(state: MemoryState, seat: MemorySeat): MemoryState {
  if (state.over || !isIn(state, seat)) return state;
  const quit = state.quit.map((q, other) => q || other === seat);
  const left = { ...state, quit, quitOrder: [...state.quitOrder, seat] };
  if (state.turn !== seat) return settle(left);
  return settle({ ...left, open: null, turn: nextInSeat(left, seat) ?? seat });
}

/**
 * The final order: everyone who stayed by pairs found (level: the same place), then the quitters, the last to quit
 * first. Everyone's pairs go with their place, to show on the results.
 */
export function finalPlaces(state: MemoryState): PartyPlace[] {
  const seats = state.quit.map((_, seat) => seat);
  const stayed = seats.filter((seat) => isIn(state, seat)).sort((a, b) => pairsOf(state, b) - pairsOf(state, a) || a - b);
  const places: PartyPlace[] = [];
  stayed.forEach((seat, i) => {
    const level = i > 0 && pairsOf(state, stayed[i - 1]!) === pairsOf(state, seat);
    places.push({ seat, place: level ? places.at(-1)!.place : i + 1, quit: false, score: pairsOf(state, seat) });
  });
  for (const seat of [...state.quitOrder].reverse()) places.push({ seat, place: places.length + 1, quit: true, score: pairsOf(state, seat) });
  return places;
}

/** Everyone who stayed with the most pairs (a shared win when level); none if everyone quit. */
export function winners(state: MemoryState): MemorySeat[] {
  return state.over ? finalPlaces(state).filter((p) => p.place === 1 && !p.quit).map((p) => p.seat) : [];
}

/**
 * The game as phones may see it: only cards face up (found, or the one open this turn) show their faces, and what's
 * left to turn stays with the server. The last two cards turned stay in `lastMove`, everyone has just seen them.
 */
export function view(state: MemoryState): MemoryState {
  const cards = state.cards.map((face, card) => (state.taken[card] !== null || state.open === card ? face : null));
  return { ...state, cards, undealt: [] };
}
