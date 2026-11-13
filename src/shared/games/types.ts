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
