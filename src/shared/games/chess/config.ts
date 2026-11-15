/** Gameplay numbers for Chess. */
export const CHESS_CONFIG = {
  /** Squares per side. */
  size: 8,
  /** Each player's clock at the start of the game (owner decision: 10 minutes each). */
  clockMs: 10 * 60_000,
  /** Added to the mover's clock after each move they make (owner decision: 10 min + 5 s). */
  incrementMs: 5_000,
  /** The longest one move may take (owner decision: 2 minutes). Past it, or past your clock, you lose at once: no move is played for you. */
  moveLimitMs: 2 * 60_000,
  /** A draw once this many moves each pass with no capture and no pawn moving (the 50-move rule; automatic, owner decision). */
  quietMovesEach: 50,
  /** A draw once the same position (same side to move, same rights) comes up this many times (automatic, owner decision). */
  repetitions: 3,
} as const;

export const SQUARE_COUNT = CHESS_CONFIG.size * CHESS_CONFIG.size;
