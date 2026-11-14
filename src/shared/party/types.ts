import type { DotsClashState } from "../games/dotsclash/types";
import type { PartyGameId } from "../games/catalog";
import type { LudoState } from "../games/ludo/types";
import type { SnakesLaddersState } from "../games/snakesladders/types";
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

/** Each party game's whole state, by catalog id. */
export interface PartyStates {
  dotsclash: DotsClashState;
  snakesladders: SnakesLaddersState;
  ludo: LudoState;
}

interface PartyCommon {
  /** Server time it started; also tells one game from the next. */
  startedAt: number;
  /** In turn order: `entrants[seat]` plays seat's turns (seat 0 first). */
  entrants: PartyEntrant[];
  /** Server time the current turn (or round of picks) began; its timer runs from here. */
  turnStartedAt: number;
  finished: boolean;
  /** Best first; filled in when it finishes. */
  results: PartyResult[];
  championIds: PlayerId[];
}

/**
 * A turn-based game everyone in the room plays together on one board (Dots Clash, Snakes & Ladders, Ludo). The room holds its
 * whole state, like a tournament's turn-based match; the server needs no timers, so the room sleeps between turns.
 * `Party<"dotsclash">` is one game's; `Party` is any of them (narrowed by `gameId`).
 */
export type Party<G extends PartyGameId = PartyGameId> = {
  [K in G]: PartyCommon & { gameId: K; game: PartyStates[K] };
}[G];
