import type { HttpError, RoomError } from "../../shared/protocol/errors";
import { CLOSE_CODES } from "../../shared/protocol/errors";

/** Short, shouty UI copy for every error the player can hit. */
const ROOM_ERRORS: Record<RoomError, string> = {
  GAME_OVER: "Game's over!",
  NOT_YOUR_TURN: "Not your turn yet!",
  CELL_TAKEN: "That spot's taken!",
  INVALID_MOVE: "Can't play there!",
  BAD_MESSAGE: "Something went wrong.",
  BAD_NAME: "Pick a name first!",
  NOT_HOST: "Only the host can do that.",
  NOT_ENOUGH_PLAYERS: "Need more players for that game!",
  NOT_IN_MATCH: "You're not in that match.",
  TOO_EARLY: "Still time left!",
  WRONG_PHASE: "Can't do that right now.",
};

const HTTP_ERRORS: Record<HttpError | "OFFLINE", string> = {
  SERVERS_FULL: "Servers are full!",
  BAD_ORIGIN: "This site isn't allowed to reach the game servers.",
  NOT_FOUND: "Couldn't find that.",
  UPGRADE_REQUIRED: "Your browser couldn't connect.",
  INTERNAL: "Our servers tripped up. Try again!",
  OFFLINE: "You're offline!",
};

const CLOSE_MESSAGES: Record<number, string> = {
  [CLOSE_CODES.roomNotFound]: "That room doesn't exist or has closed.",
  [CLOSE_CODES.roomFull]: "That room is already full!",
  [CLOSE_CODES.replaced]: "You opened this room in another tab.",
  [CLOSE_CODES.badRequest]: "Couldn't join that room.",
};

export const roomErrorMessage = (error: RoomError) => ROOM_ERRORS[error];
export const httpErrorMessage = (error: HttpError | "OFFLINE") => HTTP_ERRORS[error];
export const closeMessage = (closeCode: number) => CLOSE_MESSAGES[closeCode] ?? "Lost the room.";
