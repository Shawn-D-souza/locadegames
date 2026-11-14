/** Side in a 1v1 match. Seat 0 starts. */
export type Seat = 0 | 1;

export type GameOutcome = { kind: "playing" } | { kind: "win"; seat: Seat } | { kind: "draw" };

export type MoveError = "GAME_OVER" | "NOT_YOUR_TURN" | "INVALID_MOVE" | "CELL_TAKEN";

export type MoveResult<State> = { ok: true; state: State } | { ok: false; error: MoveError };

/**
 * What the room and tournament need from a 1v1 turn-based game. Pure functions only,
 * so client and server agree.
 */
export interface MatchGame<State, Move> {
  create(firstTurn: Seat): State;
  /** Validates an untrusted move from the wire; null if malformed. */
  parseMove(raw: unknown): Move | null;
  applyMove(state: State, seat: Seat, move: Move): MoveResult<State>;
  turn(state: State): Seat;
  outcome(state: State): GameOutcome;
  /** Played for a player whose turn timer ran out. Deterministic, no luck. */
  autoMove(state: State): Move;
  /** How long the turn now running lasts, when it isn't the catalog's `turnTimeMs` (Sea Battle: placing takes longer). */
  turnTimeMs?(state: State): number;
  /** Whether a move keeps the running clock instead of starting a new turn (both players placing at once: one getting ready doesn't restart the other's time). */
  keepsClock?(before: State, after: State): boolean;
  /**
   * A turn ran out, when that is more than `autoMove` for whoever's turn it is (both players placing at once).
   * `seed`: a fresh random number from the server, never shown to the players.
   */
  expire?(state: State, seed: number): State;
  /** What `viewer` (a seat, or null for anyone else) may see of a match still being played, when some of it is secret. */
  viewFor?(state: State, viewer: Seat | null): State;
}

/** A seat's place when a game everyone plays together ends. */
export interface PartyPlace {
  /** 0 … players - 1, in turn order. */
  seat: number;
  /** 1 = winner. Players out on the same move may share a place. */
  place: number;
  quit: boolean;
}

/**
 * What the room needs from a turn-based game everyone plays together on one board (the party format: Dots Clash,
 * Snakes & Ladders). Pure functions only, so client and server agree. Seats are in turn order.
 */
export interface PartyGame<State, Move> {
  create(players: number): State;
  /** Validates an untrusted move from the wire; null if malformed. `loadedDice`: a dev server lets playtests choose dice. */
  parseMove(raw: unknown, loadedDice: boolean): Move | null;
  /** `seed`: a fresh random number from the server for anything left to chance (a die), never known ahead. */
  applyMove(state: State, seat: number, move: Move, seed: number): MoveResult<State>;
  /** Whose turn it is, or null while everyone acts at once (Dots Clash's secret picks) and once over. */
  turn(state: State): number | null;
  /** Everyone acts at once (Dots Clash's secret picks): everyone claims the timeout. */
  allAtOnce(state: State): boolean;
  /** Tells one turn (or round of picks) from the next; a timeout claim names it. */
  moves(state: State): number;
  /** The turn (or picks) ran out: what the server plays. `seed`: a fresh random number. */
  expire(state: State, seed: number): MoveResult<State>;
  /** Still playing: not out, finished or quit (may quit). */
  isIn(state: State, seat: number): boolean;
  /** `seat` quit (✕ or left the room). */
  quitSeat(state: State, seat: number): State;
  over(state: State): boolean;
  /** Who gets the room trophy once over (none if everyone quit). */
  winners(state: State): number[];
  finalPlaces(state: State): PartyPlace[];
  /** How long the latest move takes to play out on screen: the next turn's clock starts after it. */
  playOutMs(state: State): number;
  /** The game as every phone may see it (Dots Clash: the secret picks hidden). */
  view(state: State): State;
}
