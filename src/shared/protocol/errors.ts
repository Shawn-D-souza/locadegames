import type { MoveError } from "../games/types";

export type RoomError =
  | MoveError
  | "BAD_MESSAGE"
  | "BAD_NAME"
  | "NOT_HOST"
  | "NOT_ENOUGH_PLAYERS"
  | "NOT_IN_MATCH"
  | "TOO_EARLY"
  | "WRONG_PHASE";

export type HttpError =
  | "SERVERS_FULL"
  | "BAD_ORIGIN"
  | "NOT_FOUND"
  | "UPGRADE_REQUIRED"
  | "INTERNAL";

/** WebSocket close codes the server uses to end a connection on purpose. */
export const CLOSE_CODES = {
  left: 4000,
  replaced: 4001,
  badRequest: 4400,
  roomNotFound: 4404,
  roomFull: 4409,
} as const;

export type CloseCode = (typeof CLOSE_CODES)[keyof typeof CLOSE_CODES];

/** Close codes after which the client must not auto-reconnect. */
export const FINAL_CLOSE_CODES: readonly number[] = Object.values(CLOSE_CODES);
