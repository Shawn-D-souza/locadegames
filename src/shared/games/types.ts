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
}
