import type { ServerMessage } from "../../src/shared/protocol/messages";
import type { PlayerId } from "../../src/shared/rooms/types";
import type { PendingConnection, RoomTransport } from "../../src/server/rooms/ports";

export interface FakeConnection extends PendingConnection {
  playerId: PlayerId | null;
  received: ServerMessage[];
  /** Binary (real-time game) frames, in order. */
  frames: Uint8Array[];
  closedWith: number | null;
}

/** Records what each fake connection was sent, keyed by room code. */
export class FakeTransport implements RoomTransport {
  private readonly connections = new Map<string, FakeConnection[]>();

  connect(code: string): FakeConnection {
    const conn: FakeConnection = {
      playerId: null,
      received: [],
      frames: [],
      closedWith: null,
      attach: (playerId) => (conn.playerId = playerId),
      send: (message) => conn.received.push(message),
      close: (closeCode) => (conn.closedWith = closeCode),
    };
    this.connections.set(code, [...(this.connections.get(code) ?? []), conn]);
    return conn;
  }

  broadcast(code: string, message: ServerMessage) {
    for (const c of this.open(code)) c.received.push(message);
  }
  sendTo(code: string, playerId: PlayerId, message: ServerMessage) {
    for (const c of this.open(code)) if (c.playerId === playerId) c.received.push(message);
  }
  broadcastBinary(code: string, data: Uint8Array) {
    for (const c of this.open(code)) c.frames.push(data);
  }
  sendBinary(code: string, playerId: PlayerId, data: Uint8Array) {
    for (const c of this.open(code)) if (c.playerId === playerId) c.frames.push(data);
  }
  dropPlayer(code: string, playerId: PlayerId, closeCode: number) {
    for (const c of this.open(code)) {
      if (c.playerId === playerId) {
        c.playerId = null;
        c.closedWith = closeCode;
      }
    }
  }

  private open(code: string) {
    return (this.connections.get(code) ?? []).filter((c) => c.playerId !== null && c.closedWith === null);
  }
}

export function lastRoom(conn: FakeConnection) {
  const rooms = conn.received.filter((m) => m.type === "room");
  return rooms.length ? rooms[rooms.length - 1]!.room : null;
}
