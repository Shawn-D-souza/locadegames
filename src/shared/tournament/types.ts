import type { TournamentGameId } from "../games/catalog";
import type { GameState } from "../games/registry";
import type { PlayerId } from "../rooms/types";

/** A player as they entered the tournament (kept even if they leave the room). */
export interface Entrant {
  id: PlayerId;
  name: string;
}

/** How a match ended: someone won, it was drawn, or the other player left. */
export type MatchResult = "win" | "draw" | "forfeit";

/** What the room keeps of a live (real-time) match: the score so far. The game itself runs in the server's memory. */
export interface LiveScore {
  score: [number, number];
}

interface MatchBase {
  id: number;
  /** `players[seat]`; seat 0 starts (a live game: seat 0 is on the left). */
  players: [PlayerId, PlayerId];
  /** Server time the current turn began; the turn timer runs from here. A live match: when it starts. */
  turnStartedAt: number;
  /** Null while the match is live. */
  result: MatchResult | null;
  /** Set for a win or forfeit; null for a draw. */
  winner: PlayerId | null;
}

/** A match of a turn-based game: the room holds its whole state. */
export interface TurnMatch extends MatchBase {
  game: GameState;
}

/** A match of a real-time game. */
export interface LiveMatch extends MatchBase {
  game: LiveScore;
}

export type Match = TurnMatch | LiveMatch;

export interface Round {
  /** Server time all its matches begin (rounds after the first wait a short break). */
  startsAt: number;
  matches: Match[];
  /** Who sits out this round (odd number of players); it counts as a win. */
  bye: PlayerId | null;
}

/**
 * Swiss-style: everyone plays every round, players on similar points meet, and the
 * most points after the last round wins. Players level at the top share the title.
 */
export interface Tournament {
  gameId: TournamentGameId;
  /** Server time it started; also tells one tournament from the next. */
  startedAt: number;
  /** Random number picked by the server at the start; flips the coin for who starts a match (see `seatPair`). */
  coinSeed: number;
  /** In seed order: most trophies, then earliest joiner. */
  entrants: Entrant[];
  /** Entrants who quit or left the room; they keep their points but are no longer paired or crowned. */
  left: PlayerId[];
  rounds: Round[];
  totalRounds: number;
  /** Set once it is over; empty with `finished` means everyone left. */
  championIds: PlayerId[];
  finished: boolean;
  nextMatchId: number;
}

/** A player entering, with what seeding needs. */
export interface Seed {
  id: PlayerId;
  name: string;
  trophies: number;
  joinOrder: number;
}

export interface Standing {
  id: PlayerId;
  name: string;
  points: number;
  /** 1 = champion. Players level on points share a place; null once they left. */
  place: number | null;
}
