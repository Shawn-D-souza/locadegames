import { getGame, type GameId } from "../games/catalog";
import { MATCH_GAMES } from "../games/registry";
import type { MoveError, Seat } from "../games/types";
import type { PlayerId } from "../rooms/types";
import { TOURNAMENT_CONFIG } from "./config";
import type { Match, Round, Seed, Standing, Tournament } from "./types";

/**
 * Swiss-style tournament, pure and deterministic: pairing, byes and seats follow
 * fixed rules (points, trophies, join order), never chance. Draws are a normal result.
 * A room with exactly two players plays one match.
 */

export type TournamentError = MoveError | "NOT_IN_MATCH" | "TOO_EARLY";
export type TournamentUpdate = { ok: true; tournament: Tournament } | { ok: false; error: TournamentError };

export function currentRound(t: Tournament): Round {
  return t.rounds[t.rounds.length - 1]!;
}

export function isLive(match: Match): boolean {
  return match.result === null;
}

export function turnDeadline(t: Tournament, match: Match): number {
  return match.turnStartedAt + getGame(t.gameId).turnTimeMs;
}

/** Enough rounds for a clear leader: 2 players → 1, 3–4 → 2, 5–8 → 3. */
export function roundsFor(players: number): number {
  return Math.max(1, Math.ceil(Math.log2(players)));
}

/** The live match `playerId` is in this round, if any. */
export function findActiveMatch(t: Tournament, playerId: PlayerId): Match | undefined {
  if (t.finished) return undefined;
  return currentRound(t).matches.find((m) => isLive(m) && m.players.includes(playerId));
}

const allMatches = (t: Tournament) => t.rounds.flatMap((r) => r.matches);

function matchPoints(match: Match, id: PlayerId): number {
  if (match.result === null || !match.players.includes(id)) return 0;
  if (match.result === "draw") return TOURNAMENT_CONFIG.drawPoints;
  return match.winner === id ? TOURNAMENT_CONFIG.winPoints : 0;
}

export function pointsOf(t: Tournament, id: PlayerId): number {
  return t.rounds.reduce(
    (sum, r) => sum + (r.bye === id ? TOURNAMENT_CONFIG.byePoints : 0) + r.matches.reduce((s, m) => s + matchPoints(m, id), 0),
    0,
  );
}

const seedIndex = (t: Tournament, id: PlayerId) => t.entrants.findIndex((e) => e.id === id);

/** Players still in, best first: most points, then seed. */
function ranked(t: Tournament): PlayerId[] {
  const points = new Map(t.entrants.map((e) => [e.id, pointsOf(t, e.id)]));
  return t.entrants
    .map((e) => e.id)
    .filter((id) => !t.left.includes(id))
    .sort((a, b) => points.get(b)! - points.get(a)! || seedIndex(t, a) - seedIndex(t, b));
}

const havePlayed = (t: Tournament, a: PlayerId, b: PlayerId) =>
  allMatches(t).some((m) => m.players.includes(a) && m.players.includes(b));

/** Pairs best-ranked first with the next player they have not met; null if no such pairing exists. */
function pairWithoutRematch(t: Tournament, ids: PlayerId[]): [PlayerId, PlayerId][] | null {
  if (ids.length === 0) return [];
  const [first, ...rest] = ids;
  for (const partner of rest) {
    if (havePlayed(t, first!, partner)) continue;
    const others = pairWithoutRematch(t, rest.filter((id) => id !== partner));
    if (others) return [[first!, partner], ...others];
  }
  return null;
}

/** Seat 0 starts: whoever has started fewer games, else the better ranked. */
function seatPair(t: Tournament, [a, b]: [PlayerId, PlayerId]): [PlayerId, PlayerId] {
  const starts = (id: PlayerId) => allMatches(t).filter((m) => m.players[0] === id).length;
  return starts(b) < starts(a) ? [b, a] : [a, b];
}

function newMatch(t: Tournament, players: [PlayerId, PlayerId], now: number): Match {
  return {
    id: t.nextMatchId++,
    players,
    game: MATCH_GAMES[t.gameId].create(0),
    turnStartedAt: now,
    result: null,
    winner: null,
  };
}

/** Pairs everyone still in for a round starting at `startAt`. The bye goes to the lowest-ranked player who has not had one. */
function addRound(t: Tournament, startAt: number): Tournament {
  const next: Tournament = { ...t, rounds: [...t.rounds] };
  let order = ranked(t);
  let bye: PlayerId | null = null;
  if (order.length % 2 === 1) {
    const hadBye = new Set(t.rounds.map((r) => r.bye));
    bye = [...order].reverse().find((id) => !hadBye.has(id)) ?? order[order.length - 1]!;
    order = order.filter((id) => id !== bye);
  }
  let pairs: [PlayerId, PlayerId][];
  if (t.rounds.length === 0) {
    // Round 1: best seed meets the weakest, 1 v n, 2 v n-1, ...
    pairs = Array.from({ length: order.length / 2 }, (_, i) => [order[i]!, order[order.length - 1 - i]!]);
  } else {
    // Neighbours on points meet; a rematch only if nothing else fits.
    pairs =
      pairWithoutRematch(t, order) ?? Array.from({ length: order.length / 2 }, (_, i) => [order[2 * i]!, order[2 * i + 1]!]);
  }
  next.rounds.push({ startsAt: startAt, matches: pairs.map((pair) => newMatch(next, seatPair(t, pair), startAt)), bye });
  return next;
}

export function startTournament(gameId: GameId, players: Seed[], now: number): Tournament {
  const seeds = [...players].sort((a, b) => b.trophies - a.trophies || a.joinOrder - b.joinOrder);
  const t: Tournament = {
    gameId,
    startedAt: now,
    entrants: seeds.map(({ id, name }) => ({ id, name })),
    left: [],
    rounds: [],
    totalRounds: roundsFor(seeds.length),
    championIds: [],
    finished: false,
    nextMatchId: 1,
  };
  return addRound(t, now);
}

/** Once every match in the round is over: the next round, or the champions (everyone level on top points). */
function advance(t: Tournament, now: number): Tournament {
  if (currentRound(t).matches.some(isLive)) return t;
  const stillIn = ranked(t);
  if (t.rounds.length < t.totalRounds && stillIn.length >= 2) return addRound(t, now + TOURNAMENT_CONFIG.roundBreakMs);
  const top = stillIn.length > 0 ? pointsOf(t, stillIn[0]!) : 0;
  return { ...t, championIds: stillIn.filter((id) => pointsOf(t, id) === top), finished: true };
}

function replaceMatch(t: Tournament, match: Match): Tournament {
  const rounds = [...t.rounds];
  const round = currentRound(t);
  rounds[rounds.length - 1] = { ...round, matches: round.matches.map((m) => (m.id === match.id ? match : m)) };
  return { ...t, rounds };
}

function play(t: Tournament, match: Match, seat: Seat, move: unknown, now: number): TournamentUpdate {
  const rules = MATCH_GAMES[t.gameId];
  const result = rules.applyMove(match.game, seat, move);
  if (!result.ok) return { ok: false, error: result.error };
  const outcome = rules.outcome(result.state);
  let played: Match = { ...match, game: result.state, turnStartedAt: now };
  if (outcome.kind === "win") played = { ...played, result: "win", winner: match.players[outcome.seat] };
  if (outcome.kind === "draw") played = { ...played, result: "draw" };
  return { ok: true, tournament: advance(replaceMatch(t, played), now) };
}

export function playMove(t: Tournament, playerId: PlayerId, rawMove: unknown, now: number): TournamentUpdate {
  const match = findActiveMatch(t, playerId);
  if (!match) return { ok: false, error: "NOT_IN_MATCH" };
  // The round has not started yet (break between rounds).
  if (now < match.turnStartedAt) return { ok: false, error: "TOO_EARLY" };
  const move = MATCH_GAMES[t.gameId].parseMove(rawMove);
  if (move === null) return { ok: false, error: "INVALID_MOVE" };
  return play(t, match, match.players.indexOf(playerId) as Seat, move, now);
}

/** Anyone in the room may report an expired turn; the server checks its own clock and plays the auto move. */
export function claimTimeout(t: Tournament, matchId: number, now: number): TournamentUpdate {
  const match = t.finished ? undefined : currentRound(t).matches.find((m) => m.id === matchId && isLive(m));
  if (!match) return { ok: false, error: "NOT_IN_MATCH" };
  if (now < turnDeadline(t, match)) return { ok: false, error: "TOO_EARLY" };
  const rules = MATCH_GAMES[t.gameId];
  return play(t, match, rules.turn(match.game), rules.autoMove(match.game), now);
}

/** A player quit or left the room: they lose their live match and are not paired again. */
export function removePlayer(t: Tournament, playerId: PlayerId, now: number): Tournament {
  if (t.finished || t.left.includes(playerId) || !t.entrants.some((e) => e.id === playerId)) return t;
  const match = findActiveMatch(t, playerId);
  let next: Tournament = { ...t, left: [...t.left, playerId] };
  if (match) {
    next = replaceMatch(next, { ...match, result: "forfeit", winner: match.players.find((id) => id !== playerId)! });
  }
  return advance(next, now);
}

/** Players still in by points (level points share a place), then those who left. */
export function standings(t: Tournament): Standing[] {
  const inOrder = ranked(t).map((id) => ({ id, points: pointsOf(t, id) }));
  const placed = inOrder.map(({ id, points }) => ({
    id,
    name: t.entrants[seedIndex(t, id)]!.name,
    points,
    place: 1 + inOrder.filter((o) => o.points > points).length,
  }));
  const gone = t.left.map((id) => ({ id, name: t.entrants[seedIndex(t, id)]!.name, points: pointsOf(t, id), place: null }));
  return [...placed, ...gone];
}
