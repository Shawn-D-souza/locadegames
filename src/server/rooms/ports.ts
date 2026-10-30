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
  /** Detaches and closes every connection currently held by `playerId`. */
  dropPlayer(code: string, playerId: PlayerId, closeCode: CloseCode, reason: string): void;
}

/** A connection that has not been assigned a player yet. */
export interface PendingConnection {
  attach(playerId: PlayerId): void;
  send(message: ServerMessage): void;
  close(closeCode: CloseCode, reason: string): void;
}
