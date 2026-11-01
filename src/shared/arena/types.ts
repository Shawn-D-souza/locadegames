import type { ArenaGameId } from "../games/catalog";
import type { PlayerId } from "../rooms/types";

/** A player as they entered the match (kept even if they leave the room). */
export interface ArenaEntrant {
  id: PlayerId;
  name: string;
}

export interface ArenaResult {
  id: PlayerId;
  /** 1 = champion. Exactly level players share a place. */
  place: number;
  /** Land at the end in hundredths of a percent (736 = 7.36%); 0 once out. */
  landShare: number;
  /** How long they lasted, for players who went out; null if still in at the end. */
  survivedMs: number | null;
  quit: boolean;
}

/**
 * A real-time match where everyone in the room plays together. The room keeps only this summary;
 * the live game runs in the server's memory and streams to the clients as binary snapshots.
 */
export interface Arena {
  gameId: ArenaGameId;
  /** Server time it was created; also tells one match from the next. */
  startedAt: number;
  /** Server time the countdown ends and play begins. */
  startsAt: number;
  /** Server time the clock runs out. */
  endsAt: number;
  /** Arena size in world units (grows with the player count). */
  radius: number;
  /** In start-position order. */
  entrants: ArenaEntrant[];
  finished: boolean;
  /** Best first; filled in when it finishes. */
  results: ArenaResult[];
  championIds: PlayerId[];
}
