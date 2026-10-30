/** Gameplay numbers for tic-tac-toe. */
export const TICTACTOE_CONFIG = {
  boardSize: 3,
  /** Each move must be made within this time or a move is played for you. */
  turnTimeMs: 30_000,
} as const;

export const CELL_COUNT = TICTACTOE_CONFIG.boardSize * TICTACTOE_CONFIG.boardSize;
