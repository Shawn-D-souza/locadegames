import { isGameId } from "../games/catalog";
import type { ClientMessage, ServerMessage } from "./messages";
import { ROOM_CONFIG } from "../rooms/config";

type Json = Record<string, unknown>;

function parseObject(raw: string): Json | null {
  if (raw.length > ROOM_CONFIG.maxMessageBytes) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
  } catch {
    return null;
  }
}

/** Validates an untrusted client message; returns null when malformed. */
export function parseClientMessage(raw: string): ClientMessage | null {
  const msg = parseObject(raw);
  if (!msg) return null;
  switch (msg.type) {
    case "suggest": {
      const gameId = msg.gameId;
      return gameId === null || isGameId(gameId) ? { type: "suggest", gameId } : null;
    }
    case "start": {
      const gameId = msg.gameId;
      return isGameId(gameId) ? { type: "start", gameId } : null;
    }
    case "move":
      // Shape is checked by the game's own parseMove.
      return "move" in msg ? { type: "move", move: msg.move } : null;
    case "timeout":
      return Number.isInteger(msg.matchId) ? { type: "timeout", matchId: msg.matchId as number } : null;
    case "backToRoom":
    case "quit":
    case "leave":
      return { type: msg.type };
    default:
      return null;
  }
}

/** Light shape check for messages from our own server. */
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const type = (value as Json).type;
    return type === "welcome" || type === "room" || type === "error" ? (value as ServerMessage) : null;
  } catch {
    return null;
  }
}
