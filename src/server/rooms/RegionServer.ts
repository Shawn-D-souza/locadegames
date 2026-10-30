import { DurableObject } from "cloudflare:workers";
import { ROOM_CONFIG } from "../../shared/rooms/config";
import { normalizeRoomCode } from "../../shared/rooms/roomCode";
import type { Env } from "../env";
import { matchRoomSocketPath } from "../http/paths";
import { rejectSocket } from "../http/rejectSocket";
import { HibernationTransport, readAttachment, safeSend, type SocketAttachment } from "./hibernationTransport";
import { RoomService } from "./roomService";
import { SqliteRoomStore } from "./sqliteRoomStore";

/**
 * Thin Durable Object adapter: one instance per region hosts many rooms.
 * All rules live in RoomService/roomLogic; this file only wires sockets and storage.
 * Uses the WebSocket Hibernation API so idle turn-based rooms cost no duration.
 */
export class RegionServer extends DurableObject<Env> {
  private readonly rooms: RoomService;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Keepalive pings are answered without waking the object or counting as requests.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(ROOM_CONFIG.pingMessage, ROOM_CONFIG.pongMessage));
    this.rooms = new RoomService(new SqliteRoomStore(ctx.storage.sql), new HibernationTransport(ctx), Date.now);
  }

  /** RPC from the matchmaking Worker. */
  createRoom(code: string): boolean {
    return this.rooms.createRoom(code);
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = normalizeRoomCode(matchRoomSocketPath(url.pathname) ?? "");

    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    let rejected: Response | null = null;

    this.rooms.join(
      code,
      {
        name: url.searchParams.get("name") ?? "",
        token: url.searchParams.get("token"),
        newToken: crypto.randomUUID(),
      },
      {
        // Only sockets that got a player slot join hibernation; rejected ones are closed right away.
        attach: (playerId) => {
          this.ctx.acceptWebSocket(server, [code]);
          server.serializeAttachment({ code, playerId } satisfies SocketAttachment);
        },
        send: (message) => safeSend(server, JSON.stringify(message)),
        close: (closeCode, reason) => {
          rejected = rejectSocket(closeCode, reason);
        },
      },
    );
    return rejected ?? new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = readAttachment(ws);
    if (attachment?.playerId == null) return;
    const raw = typeof message === "string" ? message : "";
    this.rooms.receive(attachment.code, attachment.playerId, raw);
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    this.handleGone(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    this.handleGone(ws);
  }

  private handleGone(ws: WebSocket): void {
    const attachment = readAttachment(ws);
    if (attachment?.playerId != null) {
      ws.serializeAttachment({ code: attachment.code, playerId: null } satisfies SocketAttachment);
      this.rooms.disconnect(attachment.code, attachment.playerId);
    }
    try {
      ws.close(); // Complete the close handshake (no-op if the runtime already replied).
    } catch {
      // Already closed.
    }
  }
}
