/** Gameplay numbers for Ultimate Tic-tac-toe: a 3×3 board of small 3×3 boards. */
export const ULTIMATE_CONFIG = {
  /** Small boards per side of the big board, and cells per side of a small board. */
  boardSize: 3,
  /** Each move must be made within this time or a move is played for you (owner decision). */
  turnTimeMs: 30_000,
} as const;

/** Cells in one small board, and small boards in the big one. */
export const SMALL_CELLS = ULTIMATE_CONFIG.boardSize * ULTIMATE_CONFIG.boardSize;
export const BOARD_COUNT = SMALL_CELLS;
/** Every cell of the game, numbered board by board: cell `board * 9 + cell` (each part 0–8, left to right, top to bottom). */
export const CELL_COUNT = BOARD_COUNT * SMALL_CELLS;
