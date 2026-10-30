import type { RoomError } from "../../shared/protocol/errors";
import type { RoomView, ServerMessage } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "lost" | "ended";

export interface ConnectionState {
  status: ConnectionStatus;
  playerId: PlayerId | null;
  room: RoomView | null;
  /** Server clock minus local clock, from the latest room update; used for turn timers. */
  clockOffsetMs: number;
  /** Close code that ended the session for good (left, room full, ...). */
  closeCode: number | null;
  lastError: { error: RoomError; id: number } | null;
}

export type ConnectionAction =
  | { type: "open" }
  | { type: "message"; message: ServerMessage; receivedAt: number }
  | { type: "reconnecting" }
  | { type: "lost" }
  | { type: "ended"; closeCode: number }
  | { type: "clearError" };

export const initialConnectionState: ConnectionState = {
  status: "connecting",
  playerId: null,
  room: null,
  clockOffsetMs: 0,
  closeCode: null,
  lastError: null,
};

export function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case "open":
      return { ...state, status: "connected" };
    case "message": {
      const { message } = action;
      if (message.type === "welcome") return { ...state, playerId: message.playerId };
      if (message.type === "room") {
        return { ...state, room: message.room, clockOffsetMs: message.room.serverNow - action.receivedAt };
      }
      return { ...state, lastError: { error: message.error, id: (state.lastError?.id ?? 0) + 1 } };
    }
    case "reconnecting":
      return { ...state, status: "reconnecting" };
    case "lost":
      return { ...state, status: "lost" };
    case "ended":
      return { ...state, status: "ended", closeCode: action.closeCode };
    case "clearError":
      return { ...state, lastError: null };
  }
}
