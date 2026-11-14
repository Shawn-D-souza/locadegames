/** A seat in a Pool game: 0 … players - 1, in turn order (seat 0 breaks). The room maps seats to players. */
export type PoolSeat = number;

/** Whose ball it is: the white cue ball, the black, or a seat's (in that player's color). */
export type BallOwner = "cue" | "black" | PoolSeat;

/** One ball where it stands. `on`: still on the table (not potted, nor taken off with a player who is out). */
export interface PoolBall {
  owner: BallOwner;
  x: number;
  y: number;
  on: boolean;
}

/** A shot: the direction the cue ball is struck (a unit vector, in table units) and how hard (0 … 1). */
export interface PoolShot {
  dx: number;
  dy: number;
  power: number;
}

/**
 * Why a shot was a foul (the turn passes; nothing else happens to you, owner decision: no ball in hand):
 * scratch: the cue ball went in (it goes back where it was before the shot) · noHit: it touched no ball ·
 * wrongBall: the first ball it touched wasn't one of yours (or, once yours are all down, the black).
 */
export type PoolFoul = "scratch" | "noHit" | "wrongBall";

/** What the simulation of a shot found, for the rules. */
export interface ShotOutcome {
  /** The first ball the cue ball touched (its index), or null. */
  firstHit: number | null;
  /** Balls potted, by index, in the order they dropped (the cue ball too, if it went in). */
  potted: number[];
  /** Steps the balls moved for (how long it plays out). */
  steps: number;
}

export interface PoolShotResult extends ShotOutcome {
  kind: "shot";
  seat: PoolSeat;
  shot: PoolShot;
  /** Every ball as it stood before the shot, so any phone can play it out from the start. */
  before: PoolBall[];
  /** The break: the game's first shot (any ball may be touched first). */
  breakShot: boolean;
  foul: PoolFoul | null;
  /** The black went in before its time (or on a foul): the shooter is out (owner decision). */
  out: boolean;
  /** The black went in legally, after all of the shooter's balls: they win. */
  won: boolean;
  /** The shooter goes again: one of their own balls went in, and no foul. */
  again: boolean;
}

/** A turn that ran out: it passed to the next player, no foul (owner decision); too many in a row and they're out. */
export interface PoolTimeout {
  kind: "timeout";
  seat: PoolSeat;
  /** Their turns run out in a row, this one included. */
  missed: number;
  /** That was one too many (`missedTurnsOut`): they're out, as if they'd quit. */
  out: boolean;
}

export interface PoolState {
  /** Index 0 is the cue ball and 1 the black; then everyone's colored balls. */
  balls: PoolBall[];
  players: number;
  /** Whose turn it is; -1 once the game is over. */
  turn: PoolSeat;
  /** Shots and timeouts so far: tells one turn from the next, and timeouts name it. */
  moves: number;
  /** The break has been taken. */
  broken: boolean;
  /** Seats in the order they went out by sinking the black early; their balls left the table. */
  outOrder: PoolSeat[];
  /** Seats in the order they quit (✕, left the room, or ran out of time too many turns in a row); their balls left the table. */
  quitOrder: PoolSeat[];
  /** Each seat's turns run out in a row (a shot starts it again at 0). */
  missed: number[];
  /** Whoever sank the black legally, or was the last one left in; null until then (and if nobody is). */
  winner: PoolSeat | null;
  over: boolean;
  /** The last shot or timeout, so phones can play it out; null before the first. */
  last: PoolShotResult | PoolTimeout | null;
}
