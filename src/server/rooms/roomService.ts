import type { ArenaResult } from "../../shared/arena/types";
import { CLOSE_CODES } from "../../shared/protocol/errors";
import { parseClientMessage } from "../../shared/protocol/parse";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import type { PlayerId } from "../../shared/rooms/types";
import { ArenaService } from "../arena/arenaService";
import type { PendingConnection, RoomStore, RoomTransport, Ticker } from "./ports";
import {
  abandonArena,
  applyClientMessage,
  createRoomRecord,
  disconnectPlayer,
  finishArena,
  isRoomEmpty,
  joinRoom,
  toRoomView,
  type JoinRequest,
} from "./roomLogic";
import type { RoomRecord } from "./roomRecord";

/** A random 32-bit integer (Web Crypto: in Workers and Node.js alike). */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** Coordinates store + transport around the pure room reducers, and the live real-time matches. Host-agnostic. */
export class RoomService {
  private lastSweepAt = 0;
  private readonly arenas: ArenaService;

  constructor(
    private readonly store: RoomStore,
    private readonly transport: RoomTransport,
    private readonly now: () => number,
    ticker: Ticker,
  ) {
    this.arenas = new ArenaService(transport, ticker, now, (code, results) => this.finishArena(code, results));
  }

  /** Returns false if the code is already taken. Also sweeps stale rooms. */
  createRoom(code: string): boolean {
    const now = this.now();
    if (now - this.lastSweepAt >= ROOM_CONFIG.sweepIntervalMs) {
      this.store.deleteStale(now - ROOM_CONFIG.maxRoomAgeMs, now - ROOM_CONFIG.emptyRoomTtlMs);
      this.lastSweepAt = now;
    }
    if (this.store.get(code)) return false;
    this.store.put(createRoomRecord(code, now));
    return true;
  }

  join(code: string, request: JoinRequest, connection: PendingConnection): void {
    const record = this.load(code);
    if (!record) {
      connection.close(CLOSE_CODES.roomNotFound, "Room not found");
      return;
    }
    const result = joinRoom(record, request, this.now());
    if (!result.ok) {
      const closeCode = result.error === "ROOM_FULL" ? CLOSE_CODES.roomFull : CLOSE_CODES.badRequest;
      connection.close(closeCode, result.error);
      return;
    }
    // A second tab reclaiming the same player replaces the first.
    this.transport.dropPlayer(code, result.playerId, CLOSE_CODES.replaced, "Opened elsewhere");
    connection.attach(result.playerId);
    connection.send({ type: "welcome", playerId: result.playerId, token: result.token });
    this.save(result.record);
    // Back mid-match (reconnect, or late to watch): the whole live state, then snapshots as usual.
    this.arenas.sendSync(code, result.playerId);
  }

  receive(code: string, playerId: PlayerId, raw: string): void {
    const record = this.load(code);
    if (!record) {
      this.transport.dropPlayer(code, playerId, CLOSE_CODES.roomNotFound, "Room not found");
      return;
    }
    const msg = parseClientMessage(raw);
    if (!msg) {
      this.transport.sendTo(code, playerId, { type: "error", error: "BAD_MESSAGE" });
      return;
    }
    const update = applyClientMessage(record, playerId, msg, this.now(), randomSeed());
    if (!update.ok) {
      // Timeout claims race with moves and fast clocks; the client retries, so stay quiet.
      if (msg.type !== "timeout") this.transport.sendTo(code, playerId, { type: "error", error: update.error });
      return;
    }
    if (msg.type === "quit" || msg.type === "leave") this.arenas.quit(code, playerId);
    if (msg.type === "leave") this.transport.dropPlayer(code, playerId, CLOSE_CODES.left, "Left room");
    this.save(update.record);
    // The host started a real-time game (or played it again): the live match begins now.
    const arena = update.record.arena;
    if (msg.type === "start" && arena && !arena.finished) this.arenas.start(code, arena);
  }

  /** A binary frame: real-time game traffic for the room's live match. */
  receiveBinary(code: string, playerId: PlayerId, data: ArrayBuffer): void {
    this.arenas.receive(code, playerId, data);
  }

  disconnect(code: string, playerId: PlayerId): void {
    const record = this.load(code);
    if (record) this.save(disconnectPlayer(record, playerId, this.now()));
  }

  /** The room, with a live match lost to a server restart turned back into the room. */
  private load(code: string): RoomRecord | null {
    const record = this.store.get(code);
    if (record?.phase === "playing" && record.arena && !this.arenas.has(code)) return abandonArena(record, this.now());
    return record;
  }

  private finishArena(code: string, results: ArenaResult[]): void {
    const record = this.store.get(code);
    if (record) this.save(finishArena(record, results, this.now()));
  }

  private save(record: RoomRecord): void {
    // Only "leave" removes players, so an empty room means everyone left for good.
    if (isRoomEmpty(record)) {
      this.store.delete(record.code);
      this.arenas.stop(record.code);
      return;
    }
    this.store.put(record);
    this.transport.broadcast(record.code, { type: "room", room: toRoomView(record, this.now()) });
  }
}
