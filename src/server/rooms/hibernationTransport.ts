import type { CloseCode } from "../../shared/protocol/errors";
import type { ServerMessage } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import type { RoomTransport } from "./ports";

/** Survives hibernation: each socket carries which room and player it belongs to. */
export interface SocketAttachment {
  code: string;
  playerId: PlayerId | null;
}

export function readAttachment(ws: WebSocket): SocketAttachment | null {
  return (ws.deserializeAttachment() as SocketAttachment | null) ?? null;
}

export function safeSend(ws: WebSocket, data: string | Uint8Array): void {
  try {
    ws.send(data);
  } catch {
    // Socket already closing; its close handler cleans up.
  }
}

/** RoomTransport over hibernatable WebSockets tagged with their room code. */
export class HibernationTransport implements RoomTransport {
  constructor(private readonly ctx: DurableObjectState) {}

  broadcast(code: string, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.attached(code)) safeSend(ws, data);
  }

  sendTo(code: string, playerId: PlayerId, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.attached(code, playerId)) safeSend(ws, data);
  }

  broadcastBinary(code: string, data: Uint8Array): void {
    for (const ws of this.attached(code)) safeSend(ws, data);
  }

  sendBinary(code: string, playerId: PlayerId, data: Uint8Array): void {
    for (const ws of this.attached(code, playerId)) safeSend(ws, data);
  }

  sendBinaryToMany(code: string, playerIds: readonly PlayerId[], data: Uint8Array): void {
    for (const ws of this.ctx.getWebSockets(code)) {
      const id = readAttachment(ws)?.playerId;
      if (id !== null && id !== undefined && playerIds.includes(id)) safeSend(ws, data);
    }
  }

  dropPlayer(code: string, playerId: PlayerId, closeCode: CloseCode, reason: string): void {
    for (const ws of this.attached(code, playerId)) {
      // Detach first so the close handler doesn't mark the player disconnected.
      ws.serializeAttachment({ code, playerId: null } satisfies SocketAttachment);
      try {
        ws.close(closeCode, reason);
      } catch {
        // Already closed.
      }
    }
  }

  private attached(code: string, playerId?: PlayerId): WebSocket[] {
    return this.ctx.getWebSockets(code).filter((ws) => {
      const id = readAttachment(ws)?.playerId;
      return id !== null && id !== undefined && (playerId === undefined || id === playerId);
    });
  }
}
