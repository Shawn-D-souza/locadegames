/** Gameplay numbers for Sea Battle (owner decisions, 2026-11-13). */
export const SEABATTLE_CONFIG = {
  /** Cells per side of each player's waters. */
  boardSize: 8,
  /** Every player's ships, by length; a ship's place in this list is its index everywhere (biggest first). */
  fleet: [5, 4, 3, 3, 2],
  /** Both players place their ships at the same time within this. */
  placeTimeMs: 60_000,
  /** Each shot must be fired within this or one is fired for you. */
  turnTimeMs: 30_000,
} as const;

/** Cells in each player's waters: cell `row * 8 + col`. */
export const CELL_COUNT = SEABATTLE_CONFIG.boardSize * SEABATTLE_CONFIG.boardSize;
export const FLEET_SIZE = SEABATTLE_CONFIG.fleet.length;
