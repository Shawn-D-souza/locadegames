import { getPartyGame, type PartyGameId } from "../games/catalog";
import { chainMs } from "../games/dotsclash/config";
import { applyMove, autoMove, autoPicks, finalPlaces, hidePicks, parseMove, quitSeat, createGame } from "../games/dotsclash/rules";
import type { MoveError } from "../games/types";
import type { PlayerId } from "../rooms/types";
import type { Party, PartyEntrant } from "./types";

/**
 * Everyone in the room on one board, taking turns: pure, so it stays testable. The turn order is fair over a session
 * (CLAUDE.md, Fair starts): whoever has gone first least goes earlier, ties in an order picked from the server's random
 * `coinSeed`. The game's own rules decide the rest.
 */

export type PartyError = MoveError | "NOT_IN_MATCH";
export type PartyUpdate = { ok: true; party: Party } | { ok: false; error: PartyError };

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

export function startParty(gameId: PartyGameId, players: readonly PartySeed[], now: number, coinSeed: number): Party {
  const entrants = turnOrder(players, coinSeed >>> 0);
  return {
    gameId,
    startedAt: now,
    entrants,
    game: createGame(entrants.length),
    turnStartedAt: now,
    finished: false,
    results: [],
    championIds: [],
  };
}

export function seatOf(p: Party, id: PlayerId): number {
  return p.entrants.findIndex((e) => e.id === id);
}

/** Whose turn it is, or null while everyone picks and once over. */
export function turnPlayer(p: Party): PlayerId | null {
  return p.finished ? null : (p.entrants[p.game.turn]?.id ?? null);
}

/** Everyone is picking their start (at the same time, in secret). */
export function picking(p: Party): boolean {
  return !p.finished && p.game.phase === "pick";
}

/** The party as every phone may see it: the picks stay secret until all are in. */
export function partyView(p: Party): Party {
  return { ...p, game: hidePicks(p.game) };
}

/** When the current picks or turn run out. */
export function partyDeadline(p: Party): number {
  return p.turnStartedAt + getPartyGame(p.gameId).turnTimeMs;
}

/**
 * The game changed: the next turn's clock (or round of picks) starts once the tap's chain or the revealed starts have
 * played out on screen (a quit hands the turn on at once; a single pick changes nothing); a game that ended gets its
 * results and winner.
 */
function withGame(p: Party, game: Party["game"], now: number): Party {
  const moved = game.moves !== p.game.moves;
  const turnStartedAt = moved ? now + chainMs(game.lastMove?.waves ?? 0) : game.turn !== p.game.turn ? now : p.turnStartedAt;
  const next: Party = { ...p, game, turnStartedAt };
  if (!game.over) return next;
  const results = finalPlaces(game).map(({ seat, ...rest }) => ({ id: p.entrants[seat]!.id, ...rest }));
  const championIds = game.winner === null ? [] : [p.entrants[game.winner]!.id];
  return { ...next, finished: true, results, championIds };
}

export function playPartyMove(p: Party, id: PlayerId, rawMove: unknown, now: number): PartyUpdate {
  if (p.finished) return { ok: false, error: "GAME_OVER" };
  const seat = seatOf(p, id);
  if (seat === -1) return { ok: false, error: "NOT_IN_MATCH" };
  const cell = parseMove(rawMove);
  if (cell === null) return { ok: false, error: "INVALID_MOVE" };
  const result = applyMove(p.game, seat, cell);
  if (!result.ok) return result;
  return { ok: true, party: withGame(p, result.state, now) };
}

/**
 * A client says the turn (or round of picks) numbered `turn` (its move count) ran out: the server checks its own clock
 * and plays the auto move, or picks for everyone who hasn't from `seed` (a fresh random number).
 */
export function claimPartyTimeout(p: Party, turn: number, now: number, seed: number): PartyUpdate {
  if (p.finished || turn !== p.game.moves) return { ok: false, error: "GAME_OVER" };
  if (now < partyDeadline(p)) return { ok: false, error: "NOT_YOUR_TURN" };
  if (picking(p)) return { ok: true, party: withGame(p, autoPicks(p.game, seed), now) };
  const result = applyMove(p.game, p.game.turn, autoMove(p.game));
  if (!result.ok) return result;
  return { ok: true, party: withGame(p, result.state, now) };
}

/** Whether `id` is still playing (not out, not quit). */
export function stillInParty(p: Party, id: PlayerId): boolean {
  const seat = seatOf(p, id);
  return !p.finished && seat !== -1 && p.game.outAt[seat] === null && !p.game.quit[seat];
}

/** `id` quit or left the room: out, their cells turn grey. */
export function quitParty(p: Party, id: PlayerId, now: number): PartyUpdate {
  if (!stillInParty(p, id)) return { ok: false, error: "NOT_IN_MATCH" };
  return { ok: true, party: withGame(p, quitSeat(p.game, seatOf(p, id)), now) };
}
