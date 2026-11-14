import { getPartyGame, type PartyGameId } from "../games/catalog";
import type { MoveError } from "../games/types";
import type { PlayerId } from "../rooms/types";
import { partyRules, type PartyState } from "./games";
import type { Party, PartyEntrant } from "./types";

/**
 * Everyone in the room on one board, taking turns: pure, so it stays testable. The turn order is fair over a session
 * (CLAUDE.md, Fair starts): whoever has gone first least goes earlier, ties in an order picked from the server's random
 * `coinSeed`. The game's own rules (`PARTY_GAMES`) decide the rest.
 */

export type PartyError = MoveError | "NOT_IN_MATCH";
export type PartyUpdate<P extends Party = Party> = { ok: true; party: P } | { ok: false; error: PartyError };

/** A player entering, with how many games of this kind they have gone first in this room. */
export interface PartySeed extends PartyEntrant {
  firsts: number;
}

/** A 32-bit mix of the seed and a player: their place among players tied on firsts, the same every time for the same seed. */
function tieRank(coinSeed: number, id: PlayerId): number {
  let x = (coinSeed ^ Math.imul(id + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/** The turn order: fewest firsts earlier, ties by the coin. */
export function turnOrder(players: readonly PartySeed[], coinSeed: number): PartyEntrant[] {
  return [...players]
    .sort((a, b) => a.firsts - b.firsts || tieRank(coinSeed, a.id) - tieRank(coinSeed, b.id) || a.id - b.id)
    .map(({ id, name }) => ({ id, name }));
}

export function startParty<G extends PartyGameId>(gameId: G, players: readonly PartySeed[], now: number, coinSeed: number): Party<G> {
  const entrants = turnOrder(players, coinSeed >>> 0);
  return {
    gameId,
    startedAt: now,
    entrants,
    game: partyRules(gameId).create(entrants.length),
    turnStartedAt: now,
    finished: false,
    results: [],
    championIds: [],
  } as unknown as Party<G>;
}

export function seatOf(p: Party, id: PlayerId): number {
  return p.entrants.findIndex((e) => e.id === id);
}

/** Whose turn it is, or null while everyone acts at once and once over. */
export function turnPlayer(p: Party): PlayerId | null {
  if (p.finished) return null;
  const seat = partyRules(p.gameId).turn(p.game);
  return seat === null ? null : (p.entrants[seat]?.id ?? null);
}

/** Everyone acts at the same time (Dots Clash: picking starts, in secret). */
export function allAtOnce(p: Party): boolean {
  return !p.finished && partyRules(p.gameId).allAtOnce(p.game);
}

/** The turn (or round of picks) now running: a timeout claim names it. */
export function partyTurnNumber(p: Party): number {
  return partyRules(p.gameId).moves(p.game);
}

/** The party as every phone may see it (Dots Clash: the picks stay secret until all are in). */
export function partyView<P extends Party>(p: P): P {
  return { ...p, game: partyRules(p.gameId).view(p.game) };
}

/** When the current turn (or round of picks) runs out. */
export function partyDeadline(p: Party): number {
  return p.turnStartedAt + getPartyGame(p.gameId).turnTimeMs;
}

/**
 * The game changed: the next turn's clock starts once the move has played out on screen (a Dots Clash chain, a Snakes &
 * Ladders roll; a quit hands the turn on at once; a single secret pick changes nothing); a game that ended gets its
 * results and winner.
 */
function withGame<P extends Party>(p: P, game: PartyState, now: number): P {
  const rules = partyRules(p.gameId);
  const moved = rules.moves(game) !== rules.moves(p.game);
  const turnStartedAt = moved ? now + rules.playOutMs(game) : rules.turn(game) !== rules.turn(p.game) ? now : p.turnStartedAt;
  const next = { ...p, game, turnStartedAt } as P;
  if (!rules.over(game)) return next;
  const results = rules.finalPlaces(game).map(({ seat, ...rest }) => ({ id: p.entrants[seat]!.id, ...rest }));
  const championIds = rules.winners(game).map((seat) => p.entrants[seat]!.id);
  return { ...next, finished: true, results, championIds };
}

/** `seed`: a fresh random number from the server (a die). `loadedDice`: a dev server lets playtests choose the die. */
export function playPartyMove<P extends Party>(p: P, id: PlayerId, rawMove: unknown, now: number, seed: number, loadedDice = false): PartyUpdate<P> {
  if (p.finished) return { ok: false, error: "GAME_OVER" };
  const seat = seatOf(p, id);
  if (seat === -1) return { ok: false, error: "NOT_IN_MATCH" };
  const rules = partyRules(p.gameId);
  const move = rules.parseMove(rawMove, loadedDice);
  if (move === null) return { ok: false, error: "INVALID_MOVE" };
  const result = rules.applyMove(p.game, seat, move, seed);
  if (!result.ok) return result;
  return { ok: true, party: withGame(p, result.state, now) };
}

/**
 * A client says the turn (or round of picks) numbered `turn` ran out: the server checks its own clock and plays what
 * the game does then (an auto move, a roll, picks for everyone who hasn't), using `seed`, a fresh random number.
 */
export function claimPartyTimeout<P extends Party>(p: P, turn: number, now: number, seed: number): PartyUpdate<P> {
  if (p.finished || turn !== partyTurnNumber(p)) return { ok: false, error: "GAME_OVER" };
  if (now < partyDeadline(p)) return { ok: false, error: "NOT_YOUR_TURN" };
  const result = partyRules(p.gameId).expire(p.game, seed);
  if (!result.ok) return result;
  return { ok: true, party: withGame(p, result.state, now) };
}

/** Whether `id` is still playing (not out, finished or quit). */
export function stillInParty(p: Party, id: PlayerId): boolean {
  const seat = seatOf(p, id);
  return !p.finished && seat !== -1 && partyRules(p.gameId).isIn(p.game, seat);
}

/** `id` quit or left the room: out (Dots Clash: their cells turn grey; Snakes & Ladders: their piece leaves). */
export function quitParty<P extends Party>(p: P, id: PlayerId, now: number): PartyUpdate<P> {
  if (!stillInParty(p, id)) return { ok: false, error: "NOT_IN_MATCH" };
  return { ok: true, party: withGame(p, partyRules(p.gameId).quitSeat(p.game, seatOf(p, id)), now) };
}
