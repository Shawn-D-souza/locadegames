import type { Arena } from "../arena/types";
import type { GameId } from "../games/catalog";
import type { Party } from "../party/types";
import type { PlayerId } from "../rooms/types";
import type { Tournament } from "../tournament/types";
import type { HttpError, RoomError } from "./errors";

/** lobby: picking a game · playing: a tournament or real-time match is running · finished: results screen. */
export type RoomPhase = "lobby" | "playing" | "finished";

export interface PlayerView {
  id: PlayerId;
  name: string;
  connected: boolean;
  /** Tournaments won in this room's session. */
  trophies: number;
  /** Game this player would like the host to pick next. */
  suggestion: GameId | null;
}

/** Everything a client may see about a room (no reconnect tokens). */
export interface RoomView {
  code: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: PlayerView[];
  tournament: Tournament | null;
  /** The real-time match (arena games); its live play streams separately as binary frames. */
  arena: Arena | null;
  /** A turn-based game everyone plays together on one board (Dots Clash). */
  party: Party | null;
  /** Server clock when this view was sent, so clients can show turn timers. */
  serverNow: number;
}

export type ClientMessage =
  | { type: "suggest"; gameId: GameId | null }
  | { type: "start"; gameId: GameId }
  | { type: "move"; move: unknown }
  /** A turn ran out: `matchId` names a tournament's match, or in a game everyone plays together, the turn (its move count). */
  | { type: "timeout"; matchId: number }
  /** Host, on the results: everyone back to the room. */
  | { type: "backToRoom" }
  /** Give up the rest of this tournament (your live match is lost) but stay in the room to watch. */
  | { type: "quit" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "welcome"; playerId: PlayerId; token: string }
  | { type: "room"; room: RoomView }
  | { type: "error"; error: RoomError };

/** JSON body returned by the matchmaking Worker's HTTP routes. */
export type CreateRoomResponse = { code: string };
export type HttpErrorResponse = { error: HttpError; resetAt?: string };
