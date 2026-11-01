import type { Arena, ArenaResult } from "../../shared/arena/types";
import { getGame, isTournamentGame, type ArenaGameId, type GameId } from "../../shared/games/catalog";
import { arenaRadiusFor } from "../../shared/games/territory/arena";
import { TERRITORY_CONFIG } from "../../shared/games/territory/config";
import type { RoomError } from "../../shared/protocol/errors";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import { sanitizePlayerName } from "../../shared/rooms/playerName";
import type { PlayerId } from "../../shared/rooms/types";
import { claimTimeout, playMove, removePlayer, startTournament } from "../../shared/tournament/tournament";
import type { Tournament } from "../../shared/tournament/types";
import type { PlayerRecord, RoomRecord } from "./roomRecord";

/**
 * Pure room reducers: record + event → new record. No I/O, no Cloudflare APIs,
 * so the same logic can run on Node.js later.
 */

export type RoomUpdate = { ok: true; record: RoomRecord } | { ok: false; error: RoomError };

export interface JoinRequest {
  name: string;
  /** Token from a previous session, if the client has one. */
  token: string | null;
  /** Fresh token to hand out if this is a new player. */
  newToken: string;
}

export type JoinResult =
  | { ok: true; record: RoomRecord; playerId: PlayerId; token: string }
  | { ok: false; error: "ROOM_FULL" | "BAD_NAME" };

export function createRoomRecord(code: string, now: number): RoomRecord {
  return {
    code,
    createdAt: now,
    updatedAt: now,
    emptySince: now,
    phase: "lobby",
    hostId: null,
    players: [],
    nextJoinOrder: 0,
    tournament: null,
    arena: null,
  };
}

function touch(record: RoomRecord, now: number): RoomRecord {
  const anyoneConnected = record.players.some((p) => p.connected);
  return { ...record, updatedAt: now, emptySince: anyoneConnected ? null : (record.emptySince ?? now) };
}

function updatePlayer(record: RoomRecord, id: PlayerId, change: Partial<PlayerRecord>): RoomRecord {
  return { ...record, players: record.players.map((p) => (p.id === id ? { ...p, ...change } : p)) };
}

function presentIds(record: RoomRecord): Set<PlayerId> {
  return new Set(record.players.map((p) => p.id));
}

export function isRoomEmpty(record: RoomRecord): boolean {
  return record.players.length === 0;
}

export function joinRoom(record: RoomRecord, request: JoinRequest, now: number): JoinResult {
  const returning = request.token !== null ? record.players.find((p) => p.token === request.token) : undefined;
  if (returning) {
    const next = updatePlayer(record, returning.id, { connected: true });
    return { ok: true, record: touch(next, now), playerId: returning.id, token: returning.token };
  }

  const name = sanitizePlayerName(request.name);
  if (!name) return { ok: false, error: "BAD_NAME" };

  // Lost the token (a sleeping phone drops the tab's storage, or reopened the link): the same name
  // takes back an away seat, with its color, points and live match. Never a connected player's.
  const sameName = record.players.find((p) => !p.connected && p.name.toLowerCase() === name.toLowerCase());
  if (sameName) {
    const next = updatePlayer(record, sameName.id, { connected: true });
    return { ok: true, record: touch(next, now), playerId: sameName.id, token: sameName.token };
  }

  if (record.players.length >= ROOM_CONFIG.maxPlayers) return { ok: false, error: "ROOM_FULL" };

  // Lowest free slot, so colors stay stable and get reused after someone leaves.
  const taken = presentIds(record);
  let id = 0;
  while (taken.has(id)) id++;
  const player: PlayerRecord = {
    id,
    name,
    token: request.newToken,
    connected: true,
    joinOrder: record.nextJoinOrder,
    trophies: 0,
    suggestion: null,
  };
  const next: RoomRecord = {
    ...record,
    players: [...record.players, player],
    nextJoinOrder: record.nextJoinOrder + 1,
    hostId: record.hostId ?? id,
  };
  return { ok: true, record: touch(next, now), playerId: id, token: request.newToken };
}

export function disconnectPlayer(record: RoomRecord, id: PlayerId, now: number): RoomRecord {
  if (!record.players.some((p) => p.id === id)) return record;
  return touch(updatePlayer(record, id, { connected: false }), now);
}

/** Applies a tournament change; when it ends, every champion (a shared title counts for each) gets a trophy. */
function withTournament(record: RoomRecord, tournament: Tournament): RoomRecord {
  if (!tournament.finished) return { ...record, tournament };
  if (tournament.championIds.length === 0) return { ...record, phase: "lobby", tournament: null };
  const players = record.players.map((p) => (tournament.championIds.includes(p.id) ? { ...p, trophies: p.trophies + 1 } : p));
  return { ...record, players, phase: "finished", tournament };
}

/** A real-time match ended: results in, a trophy for each champion (everyone sharing first place). */
export function finishArena(record: RoomRecord, results: ArenaResult[], now: number): RoomRecord {
  if (!record.arena || record.arena.finished) return record;
  const championIds = results.filter((r) => r.place === 1).map((r) => r.id);
  const players = record.players.map((p) => (championIds.includes(p.id) ? { ...p, trophies: p.trophies + 1 } : p));
  const arena: Arena = { ...record.arena, finished: true, results, championIds };
  return touch({ ...record, players, phase: "finished", arena }, now);
}

/** The live match was lost (the server restarted mid-game): everyone goes back to the room. */
export function abandonArena(record: RoomRecord, now: number): RoomRecord {
  return touch({ ...record, phase: "lobby", arena: null }, now);
}

/** Whether `id` is still in this room's live real-time match (they may quit it). */
function inLiveArena(record: RoomRecord, id: PlayerId): boolean {
  return record.phase === "playing" && !!record.arena && !record.arena.finished && record.arena.entrants.some((e) => e.id === id);
}

function leaveRoom(record: RoomRecord, id: PlayerId, now: number): RoomRecord {
  const players = record.players.filter((p) => p.id !== id);
  const nextHost = [...players].sort((a, b) => a.joinOrder - b.joinOrder)[0]?.id ?? null;
  let next: RoomRecord = { ...record, players, hostId: record.hostId === id ? nextHost : record.hostId };
  if (next.phase === "playing" && next.tournament) {
    next = withTournament(next, removePlayer(next.tournament, id, now));
  }
  return next;
}

function startGame(record: RoomRecord, gameId: GameId, now: number): RoomUpdate {
  // Only connected players enter; anyone away joins the next one.
  const entrants = record.players.filter((p) => p.connected);
  if (entrants.length < getGame(gameId).minPlayers) return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  const players = record.players.map((p) => ({ ...p, suggestion: null }));
  if (!isTournamentGame(gameId)) {
    return { ok: true, record: { ...record, players, phase: "playing", tournament: null, arena: newArena(gameId, entrants, now) } };
  }
  const tournament = startTournament(gameId, entrants, now);
  return { ok: true, record: { ...record, players, phase: "playing", tournament, arena: null } };
}

/** Everyone in the room plays one match; start positions follow join order. */
function newArena(gameId: ArenaGameId, entrants: PlayerRecord[], now: number): Arena {
  const startsAt = now + TERRITORY_CONFIG.countdownMs;
  return {
    gameId,
    startedAt: now,
    startsAt,
    endsAt: startsAt + TERRITORY_CONFIG.matchMs,
    radius: arenaRadiusFor(entrants.length),
    entrants: [...entrants].sort((a, b) => a.joinOrder - b.joinOrder).map(({ id, name }) => ({ id, name })),
    finished: false,
    results: [],
    championIds: [],
  };
}

export function applyClientMessage(record: RoomRecord, id: PlayerId, msg: ClientMessage, now: number): RoomUpdate {
  const isHost = record.hostId === id;
  const picking = record.phase === "lobby" || record.phase === "finished";
  let next: RoomRecord;

  switch (msg.type) {
    case "suggest":
      if (!picking) return { ok: false, error: "WRONG_PHASE" };
      next = updatePlayer(record, id, { suggestion: msg.gameId });
      break;
    case "start": {
      if (!isHost) return { ok: false, error: "NOT_HOST" };
      if (!picking) return { ok: false, error: "WRONG_PHASE" };
      const started = startGame(record, msg.gameId, now);
      if (!started.ok) return started;
      next = started.record;
      break;
    }
    case "move":
    case "timeout": {
      if (record.phase !== "playing" || !record.tournament) return { ok: false, error: "WRONG_PHASE" };
      const update =
        msg.type === "move"
          ? playMove(record.tournament, id, msg.move, now)
          : claimTimeout(record.tournament, msg.matchId, now);
      if (!update.ok) return update;
      next = withTournament(record, update.tournament);
      break;
    }
    case "quit": {
      // A real-time match takes the quitter out on its next step (the live state is not in the record).
      if (record.arena) {
        if (!inLiveArena(record, id)) return { ok: false, error: "NOT_IN_MATCH" };
        next = record;
        break;
      }
      const t = record.tournament;
      if (record.phase !== "playing" || !t) return { ok: false, error: "WRONG_PHASE" };
      if (t.left.includes(id) || !t.entrants.some((e) => e.id === id)) return { ok: false, error: "NOT_IN_MATCH" };
      next = withTournament(record, removePlayer(t, id, now));
      break;
    }
    case "backToRoom":
      if (!isHost) return { ok: false, error: "NOT_HOST" };
      if (record.phase !== "finished") return { ok: false, error: "WRONG_PHASE" };
      next = { ...record, phase: "lobby", tournament: null, arena: null };
      break;
    case "leave":
      next = leaveRoom(record, id, now);
      break;
  }
  return { ok: true, record: touch(next, now) };
}

export function toRoomView(record: RoomRecord, now: number): RoomView {
  return {
    code: record.code,
    phase: record.phase,
    hostId: record.hostId,
    players: record.players.map(({ id, name, connected, trophies, suggestion }) => ({
      id,
      name,
      connected,
      trophies,
      suggestion,
    })),
    tournament: record.tournament,
    arena: record.arena,
    serverNow: now,
  };
}
