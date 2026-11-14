/** A seat in a Snakes & Ladders game: 0 … players - 1, in turn order (seat 0 rolls first). The room maps seats to players. */
export type SnakesSeat = number;

/**
 * What one roll did. move: counted forward · ladder / snake: counted forward onto its foot / head, then up / down it ·
 * stuck: would have gone past the last square, so stayed · threeSixes: the third 6 in a row, back where the turn began.
 */
export type RollKind = "move" | "ladder" | "snake" | "stuck" | "threeSixes";

export interface SnakesRoll {
  seat: SnakesSeat;
  /** 1–6. */
  die: number;
  /** The square before the roll (0: not on the board yet). */
  from: number;
  /** Where counting the die ended (`from` when stuck or on the third 6). */
  landed: number;
  /** Where the piece rests: up the ladder, down the snake, or back where the turn began. */
  to: number;
  kind: RollKind;
  /** A 6 that didn't finish and wasn't the third: the same player rolls again. */
  again: boolean;
  /** Reached the last square with this roll. */
  finished: boolean;
}

export interface SnakesLaddersState {
  /** Per seat: their square, 0 before their first roll (they start off the board), 100 once finished. */
  positions: number[];
  /** Whose roll it is; -1 once the game is over. */
  turn: SnakesSeat;
  /** Rolls so far: tells one roll from the next, and timeouts name it. */
  moves: number;
  /** 6s rolled in a row in this turn. */
  sixes: number;
  /** The square this turn began on: three 6s in a row put the piece back here. */
  turnFrom: number;
  /** Seats in the order they reached the last square: 1st, 2nd, … */
  finishOrder: SnakesSeat[];
  /** Seats in the order they quit (✕ or left the room); their pieces leave the board. */
  quitOrder: SnakesSeat[];
  /** The last roll, so phones can play it out; null before the first. */
  lastRoll: SnakesRoll | null;
  /** Everyone but one has finished (or quit). */
  over: boolean;
}
