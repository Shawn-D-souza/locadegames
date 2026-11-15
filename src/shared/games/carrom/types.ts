/** A seat in a Carrom game: 0 … players - 1, in turn order (seat 0 breaks). The room maps seats to players. */
export type CarromSeat = number;

/** Which side of the board a seat plays from: 0 bottom, 1 right, 2 top, 3 left (as seen from side 0), going round to the right. */
export type CarromSide = 0 | 1 | 2 | 3;

export type CoinKind = "white" | "black" | "queen";

/** One coin where it lies. `on`: still on the board (not pocketed). */
export interface CarromCoin {
  kind: CoinKind;
  x: number;
  y: number;
  on: boolean;
}

/**
 * A shot: where the striker stands on your baseline (`at`, units from its middle, to your right), the direction it's
 * flicked (a unit vector, in board units) and how hard (0 … 1).
 */
export interface CarromShot {
  at: number;
  dx: number;
  dy: number;
  power: number;
}

/** What the simulation of a shot found, for the rules. */
export interface ShotOutcome {
  /** Coins pocketed, by index, in the order they dropped. */
  pocketed: number[];
  /** The striker went into a pocket: a foul. */
  strikerIn: boolean;
  /** Steps the discs moved for (how long it plays out). */
  steps: number;
}

/**
 * What became of the queen on a shot: none (nothing to do with her) · pocketed (in, she must be covered on the next
 * shot) · covered (a coin went in with her or on the shot after: her 50 points count) · returned (not covered, or in
 * on a foul: back in the middle).
 */
export type QueenNews = "none" | "pocketed" | "covered" | "returned";

export interface CarromShotResult extends ShotOutcome {
  kind: "shot";
  seat: CarromSeat;
  side: CarromSide;
  shot: CarromShot;
  /** Every coin as it lay before the shot, so any phone can play it out from the start. */
  before: CarromCoin[];
  /** The striker went in: -10 and the turn passes, and the coins that went in with it go back. */
  foul: boolean;
  /** How the shooter's score changed (coins, the queen, the penalty). */
  points: number;
  queen: QueenNews;
  /** Coins put back in the middle after the shot (a foul's, the queen not covered), by index. */
  returned: number[];
  /** The shooter goes again: a coin went in, and no foul. */
  again: boolean;
}

/** A turn that ran out: it passed to the next player; too many in a row and they're out. */
export interface CarromTimeout {
  kind: "timeout";
  seat: CarromSeat;
  /** Their turns run out in a row, this one included. */
  missed: number;
  /** That was one too many (`missedTurnsOut`): they're out, as if they'd quit. */
  out: boolean;
  /** The queen was waiting to be covered by them: back in the middle. */
  queenReturned: boolean;
}

export interface CarromState {
  /** Index 0 is the queen, then the 9 whites, then the 9 blacks. */
  coins: CarromCoin[];
  players: number;
  /** Whose turn it is; -1 once the game is over. */
  turn: CarromSeat;
  /** Shots and timeouts so far: tells one turn from the next, and timeouts name it. */
  moves: number;
  /** Each seat's points (may be below 0). */
  scores: number[];
  /** The seat that pocketed the queen and must cover her on this shot (it's their turn); null otherwise. */
  queenDue: CarromSeat | null;
  /** Seats in the order they quit (✕, left the room, or ran out of time too many turns in a row). */
  quitOrder: CarromSeat[];
  /** Each seat's turns run out in a row (a shot starts it again at 0). */
  missed: number[];
  over: boolean;
  /** The last shot or timeout, so phones can play it out; null before the first. */
  last: CarromShotResult | CarromTimeout | null;
}
