/** Gameplay numbers for 4 in a Row. */
export const FOURINAROW_CONFIG = {
  columns: 7,
  rows: 6,
  /** Discs in a line that win. */
  lineLength: 4,
  /** Each move must be made within this time or a disc is dropped for you (owner decision: the same as tic-tac-toe). */
  turnTimeMs: 30_000,
} as const;

export const CELL_COUNT = FOURINAROW_CONFIG.columns * FOURINAROW_CONFIG.rows;
