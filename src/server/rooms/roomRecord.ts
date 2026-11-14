import type { Arena } from "../../shared/arena/types";
import type { GameId } from "../../shared/games/catalog";
import type { Party } from "../../shared/party/types";
import type { RoomPhase } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import type { Tournament } from "../../shared/tournament/types";

export interface PlayerRecord {
  id: PlayerId;
  name: string;
  /** Secret that lets this player reclaim their slot after a disconnect. */
  token: string;
  connected: boolean;
  /** Increasing join counter; earlier joiners win seeding ties. */
  joinOrder: number;
  trophies: number;
  suggestion: GameId | null;
  /** Games everyone plays together (Dots Clash, Snakes & Ladders: one count for all of them) this player went first in, so the turn order is fair over the session. Missing in rooms made before it existed. */
  firsts?: number;
}

/** Persisted room state. Plain JSON so any store can hold it. */
export interface RoomRecord {
  code: string;
  createdAt: number;
  updatedAt: number;
  /** When the last player disconnected; null while someone is connected. */
  emptySince: number | null;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: PlayerRecord[];
  nextJoinOrder: number;
  tournament: Tournament | null;
  /** The real-time match, for arena games (the live state is in server memory, not here). */
  arena: Arena | null;
  /** A turn-based game everyone plays together on one board (Dots Clash); missing in rooms made before it existed. */
  party?: Party | null;
}
