import { CLOSE_CODES } from "../../shared/protocol/errors";
import { parseClientMessage } from "../../shared/protocol/parse";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import type { PlayerId } from "../../shared/rooms/types";
import type { PendingConnection, RoomStore, RoomTransport } from "./ports";
import {
  applyClientMessage,
  createRoomRecord,
  disconnectPlayer,
  isRoomEmpty,
  joinRoom,
  toRoomView,
  type JoinRequest,
} from "./roomLogic";
import type { RoomRecord } from "./roomRecord";

/** Coordinates store + transport around the pure room reducers. Host-agnostic. */
export class RoomService {
  private lastSweepAt = 0;

  constructor(
    private readonly store: RoomStore,
    private readonly transport: RoomTransport,
    private readonly now: () => number,
  ) {}

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
    const record = this.store.get(code);
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
  }

  receive(code: string, playerId: PlayerId, raw: string): void {
    const record = this.store.get(code);
    if (!record) {
      this.transport.dropPlayer(code, playerId, CLOSE_CODES.roomNotFound, "Room not found");
      return;
    }
    const msg = parseClientMessage(raw);
    if (!msg) {
      this.transport.sendTo(code, playerId, { type: "error", error: "BAD_MESSAGE" });
      return;
    }
    const update = applyClientMessage(record, playerId, msg, this.now());
    if (!update.ok) {
      // Timeout claims race with moves and fast clocks; the client retries, so stay quiet.
      if (msg.type !== "timeout") this.transport.sendTo(code, playerId, { type: "error", error: update.error });
      return;
    }
    if (msg.type === "leave") this.transport.dropPlayer(code, playerId, CLOSE_CODES.left, "Left room");
    this.save(update.record);
  }

  disconnect(code: string, playerId: PlayerId): void {
    const record = this.store.get(code);
    if (record) this.save(disconnectPlayer(record, playerId, this.now()));
  }

  private save(record: RoomRecord): void {
    // Only "leave" removes players, so an empty room means everyone left for good.
    if (isRoomEmpty(record)) {
      this.store.delete(record.code);
      return;
    }
    this.store.put(record);
    this.transport.broadcast(record.code, { type: "room", room: toRoomView(record, this.now()) });
  }
}
