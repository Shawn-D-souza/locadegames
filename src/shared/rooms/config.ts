/** Room-level numbers shared by the client and server. */
export const ROOM_CONFIG = {
  /** Digits only: phones show the number keypad and codes are easy to read aloud in any language. */
  codeLength: 6,
  codeAlphabet: "0123456789",
  /** Codes are shown as two groups ("482 913"). */
  codeGroupSize: 3,
  /** Players per room on the free plan (premium may raise it later). */
  maxPlayers: 8,
  nameMinLength: 1,
  nameMaxLength: 16,
  maxMessageBytes: 512,
  /** Keepalive text the Durable Object answers without waking up. */
  pingMessage: "ping",
  pongMessage: "pong",
  pingIntervalMs: 30_000,
  /** Rooms with nobody connected for this long are deleted. */
  emptyRoomTtlMs: 60 * 60 * 1000,
  /** Rooms older than this are deleted regardless. */
  maxRoomAgeMs: 24 * 60 * 60 * 1000,
  /** Minimum gap between stale-room sweeps, to keep SQLite row reads low. */
  sweepIntervalMs: 10 * 60 * 1000,
} as const;
