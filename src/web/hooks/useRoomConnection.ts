import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Bytes } from "../../shared/protocol/bytes";
import { CLOSE_CODES, FINAL_CLOSE_CODES } from "../../shared/protocol/errors";
import type { ClientMessage } from "../../shared/protocol/messages";
import { CLIENT_CONFIG } from "../config";
import { buildRoomSocketUrl, RoomSocket } from "../services/roomSocket";
import { clearRoomToken, loadRoomToken, saveRoomToken } from "../services/sessionStore";
import { connectionReducer, initialConnectionState } from "./connectionState";

export type BinaryListener = (data: ArrayBuffer) => void;

/**
 * Owns the room WebSocket: connect, keep the latest room state, auto-reconnect with backoff.
 * Binary game frames skip React state (20 a second); a live game subscribes to them directly.
 */
export function useRoomConnection(code: string, name: string) {
  const [state, dispatch] = useReducer(connectionReducer, initialConnectionState);
  const [attempt, setAttempt] = useState(0);
  const socketRef = useRef<RoomSocket | null>(null);
  const retriesRef = useRef(0);
  const binaryListeners = useRef(new Set<BinaryListener>());

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    // Deferred so React StrictMode's mount/unmount/mount doesn't open two sockets that grab two seats.
    const openTimer = setTimeout(() => {
      socketRef.current = new RoomSocket(buildRoomSocketUrl(code, name, loadRoomToken(code)), {
        onOpen: () => {
          retriesRef.current = 0;
          dispatch({ type: "open" });
        },
        onMessage: (message) => {
          if (message.type === "welcome") saveRoomToken(code, message.token);
          dispatch({ type: "message", message, receivedAt: Date.now() });
        },
        onBinary: (data) => {
          for (const listener of binaryListeners.current) listener(data);
        },
        onClose: (closeCode) => {
          if (FINAL_CLOSE_CODES.includes(closeCode)) {
            if (closeCode === CLOSE_CODES.left || closeCode === CLOSE_CODES.roomNotFound) clearRoomToken(code);
            dispatch({ type: "ended", closeCode });
            return;
          }
          const delay = CLIENT_CONFIG.reconnectDelaysMs[retriesRef.current];
          if (delay === undefined) {
            dispatch({ type: "lost" });
            return;
          }
          retriesRef.current += 1;
          dispatch({ type: "reconnecting" });
          reconnectTimer = setTimeout(() => setAttempt((n) => n + 1), delay);
        },
      });
    }, 0);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [code, name, attempt]);

  const send = useCallback((message: ClientMessage) => socketRef.current?.send(message), []);
  const sendBinary = useCallback((data: Bytes) => socketRef.current?.sendBinary(data), []);
  const subscribeBinary = useCallback((listener: BinaryListener) => {
    binaryListeners.current.add(listener);
    return () => {
      binaryListeners.current.delete(listener);
    };
  }, []);

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    dispatch({ type: "reconnecting" });
    setAttempt((n) => n + 1);
  }, []);

  // A phone waking up (or coming back online) reconnects at once instead of showing "Connection lost".
  const { status } = state;
  useEffect(() => {
    if (status !== "lost" && status !== "reconnecting") return;
    const wake = () => {
      if (document.visibilityState === "visible") reconnect();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [status, reconnect]);

  const leave = useCallback(() => {
    socketRef.current?.send({ type: "leave" });
    clearRoomToken(code);
  }, [code]);

  const clearError = useCallback(() => dispatch({ type: "clearError" }), []);

  return { ...state, send, sendBinary, subscribeBinary, reconnect, leave, clearError };
}
