/** A seat in a Ludo game: 0 … players - 1, in turn order (seat 0 rolls first). The room maps seats to players. */
export type LudoSeat = number;

/**
 * Where a pawn is, as how far along its own path it has come: -1 in its base, 0 on its start square, then square by
 * square round the track and up its home column, `homeProgress(board)` once home. Each player's path is the same length.
 */
export type Progress = number;

/** A pawn sent back to its base. */
export interface LudoCapture {
  seat: LudoSeat;
  pawn: number;
  /** Where it was. */
  from: Progress;
}

/** One pawn's move. */
export interface LudoStep {
  pawn: number;
  /** -1: out of its base onto its start square. */
  from: Progress;
  to: Progress;
  /** Everyone else's pawns it landed on (not on a safe square): back to their bases. */
  captured: LudoCapture[];
}

/**
 * What an action did. moved: a pawn moved (the only one that could, or the one picked) · choose: rolled, and more than
 * one pawn can move: the roller picks · noMove: rolled, and no pawn can move · threeSixes: the third 6 in a row ends
 * the turn, not played.
 */
export type LudoOutcome = "moved" | "choose" | "noMove" | "threeSixes";

export interface LudoAction {
  seat: LudoSeat;
  /** The die this action used. */
  die: number;
  /** The die was rolled in this action (a roll, or a timeout's roll and move), rather than a pawn picked for it. */
  rolled: boolean;
  outcome: LudoOutcome;
  step: LudoStep | null;
  /** The same player rolls again: a 6, a capture, or a pawn home (not once all four are home). */
  again: boolean;
  /** This action brought the player's last pawn home. */
  finished: boolean;
}

export interface LudoState {
  /** Per seat, per pawn: how far along its path. */
  pawns: Progress[][];
  /** Whose turn it is; -1 once the game is over. */
  turn: LudoSeat;
  /** Actions so far (rolls and picks): tells one from the next, and timeouts name it. */
  moves: number;
  /** 6s rolled in a row in this turn. */
  sixes: number;
  /** The die rolled, while the roller picks a pawn to move with it; null when it's time to roll. */
  die: number | null;
  /** Seats in the order they got all four pawns home: 1st, 2nd, … */
  finishOrder: LudoSeat[];
  /** Seats in the order they quit (✕ or left the room); their pawns leave the board. */
  quitOrder: LudoSeat[];
  /** The last action, so phones can play it out; null before the first. */
  last: LudoAction | null;
  /** Everyone but one has finished (or quit). */
  over: boolean;
}
