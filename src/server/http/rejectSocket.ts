import type { CloseCode } from "../../shared/protocol/errors";

/**
 * Completes the WebSocket upgrade only to close it with a reason the browser can read
 * (a plain HTTP error just shows up as close code 1006).
 */
export function rejectSocket(closeCode: CloseCode, reason: string): Response {
  const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
  server.accept();
  server.close(closeCode, reason);
  return new Response(null, { status: 101, webSocket: client });
}
