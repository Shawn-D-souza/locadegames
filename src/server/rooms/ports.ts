import type { CloseCode } from "../../shared/protocol/errors";
import type { ServerMessage } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import type { RoomRecord } from "./roomRecord";

/**
 * The only things room logic needs from its host. The Durable Object adapter
 * implements these today; a Node.js server can implement them later.
 */

export interface RoomStore {
  get(code: string): RoomRecord | null;
  put(record: RoomRecord): void;
  delete(code: string): void;
  /** Deletes rooms created before `createdBefore` or empty since before `emptyBefore`. */
  deleteStale(createdBefore: number, emptyBefore: number): void;
}

export interface RoomTransport {
  broadcast(code: string, message: ServerMessage): void;
  sendTo(code: string, playerId: PlayerId, message: ServerMessage): void;
  /** Real-time game frames (binary) to everyone in the room, players and watchers. */
  broadcastBinary(code: string, data: Uint8Array): void;
  sendBinary(code: string, playerId: PlayerId, data: Uint8Array): void;
  /** The same frame to several players of the room at once (a live 1v1 match: its two players and its watchers). */
  sendBinaryToMany(code: string, playerIds: readonly PlayerId[], data: Uint8Array): void;
  /** Detaches and closes every connection currently held by `playerId`. */
  dropPlayer(code: string, playerId: PlayerId, closeCode: CloseCode, reason: string): void;
}

/** A repeating timer for real-time matches. Runs only while a match does, so the host can sleep otherwise. */
export interface Ticker {
  /** Starts calling `onTick` every `intervalMs` (no-op if already running). */
  start(intervalMs: number, onTick: () => void): void;
  stop(): void;
}

/** A connection that has not been assigned a player yet. */
export interface PendingConnection {
  attach(playerId: PlayerId): void;
  send(message: ServerMessage): void;
  close(closeCode: CloseCode, reason: string): void;
}
