import type { GameId } from "../../shared/games/catalog";
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
}
