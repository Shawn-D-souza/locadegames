import type { ClientMessage, ServerMessage } from "../../shared/protocol/messages";
import { parseServerMessage } from "../../shared/protocol/parse";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import { CLIENT_CONFIG } from "../config";

export function buildRoomSocketUrl(code: string, name: string, token: string | null): string {
  const url = new URL(`${CLIENT_CONFIG.serverUrl}/api/rooms/${code}/ws`, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("name", name);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export interface RoomSocketHandlers {
  onOpen(): void;
  onMessage(message: ServerMessage): void;
  onClose(code: number): void;
}

/** WebSocket wrapper: JSON messages, keepalive pings, no callbacks after close(). */
export class RoomSocket {
  private readonly ws: WebSocket;
  private readonly pingTimer: ReturnType<typeof setInterval>;
  private closedByClient = false;

  constructor(url: string, handlers: RoomSocketHandlers) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => handlers.onOpen();
    this.ws.onmessage = (event) => {
      if (event.data === ROOM_CONFIG.pongMessage) return;
      const message = typeof event.data === "string" ? parseServerMessage(event.data) : null;
      if (message) handlers.onMessage(message);
    };
    this.ws.onclose = (event) => {
      clearInterval(this.pingTimer);
      if (!this.closedByClient) handlers.onClose(event.code);
    };
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) this.ws.send(ROOM_CONFIG.pingMessage);
    }, ROOM_CONFIG.pingIntervalMs);
  }

  send(message: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  close(): void {
    this.closedByClient = true;
    clearInterval(this.pingTimer);
    this.ws.close();
  }
}
