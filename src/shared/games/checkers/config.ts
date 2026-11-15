/** Gameplay numbers for Checkers (American / English rules, owner decision). */
export const CHECKERS_CONFIG = {
  /** Squares per side. */
  size: 8,
  /** Rows of men each side starts with, on its own dark squares (12 men). */
  startRows: 3,
  /** A draw once this many moves each pass with no capture and no man moving (owner decision: the 40-move rule). */
  quietMovesEach: 40,
  /** A draw once the same position (same side to move) comes up this many times (owner decision). */
  repetitions: 3,
  /** Each move must be made within this time or one is played for you (owner decision: the same as tic-tac-toe). */
  turnTimeMs: 30_000,
} as const;

export const SQUARE_COUNT = CHECKERS_CONFIG.size * CHECKERS_CONFIG.size;
