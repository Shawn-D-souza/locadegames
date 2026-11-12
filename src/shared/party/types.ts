import type { DotsClashState } from "../games/dotsclash/types";
import type { PartyGameId } from "../games/catalog";
import type { PlayerId } from "../rooms/types";

/** A player as they entered the game (kept even if they leave the room). */
export interface PartyEntrant {
  id: PlayerId;
  name: string;
}

export interface PartyResult {
  id: PlayerId;
  /** 1 = winner. Players out on the same move share a place. */
  place: number;
  quit: boolean;
}

/**
 * A turn-based game everyone in the room plays together on one board (Dots Clash). The room holds its whole state, like
 * a tournament's turn-based match; the server needs no timers, so the room sleeps between turns.
 */
export interface Party {
  gameId: PartyGameId;
  /** Server time it started; also tells one game from the next. */
  startedAt: number;
  /** In turn order: `entrants[seat]` picks and plays seat's turns (seat 0 first). */
  entrants: PartyEntrant[];
  game: DotsClashState;
  /** Server time the current pick or turn began; its timer runs from here. */
  turnStartedAt: number;
  finished: boolean;
  /** Best first; filled in when it finishes. */
  results: PartyResult[];
  championIds: PlayerId[];
}
