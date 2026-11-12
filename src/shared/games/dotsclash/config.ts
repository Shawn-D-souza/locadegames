/** Gameplay numbers for Dots Clash. */
export const DOTSCLASH_CONFIG = {
  minPlayers: 2,
  /** Each pick and each turn must be made within this time, or one is played for you (owner decision: 30 s). */
  turnTimeMs: 30_000,
  /** A cell holding this many dots explodes, one dot to each of its 4 neighbours (the board wraps, so every cell has 4). */
  burstAt: 4,
  /** Dots a starting cell gets. */
  startDots: 1,
  /**
   * Cells per side by how many play (owner decision): 2 → 6×6, 3–4 → 7×7, 5–6 → 8×8, 7–8 → 9×9.
   * Index = player count; anything above the last uses the last.
   */
  boardSizes: [6, 6, 6, 7, 7, 8, 8, 9, 9],
  /**
   * A chain stops after this many waves even if cells are still full. A wrapping board that holds more than 3 dots per
   * cell can never settle, and a chain on it could go on forever; in practice it ends long before, once only the player
   * moving is left.
   */
  maxWaves: 400,
  /**
   * How a chain plays out on every phone: the dot lands, then every wave takes the same time, however long the chain
   * (owner decision: watching the chain is the fun, so it's never sped up or skipped). The next turn's clock starts once
   * it has played out, so nobody's time goes on watching it.
   */
  landMs: 200,
  /** One wave: its dots fly for `flyMs`, then the board rests a moment with them landed (so a cell filling up to burst is seen). */
  waveMs: 380,
  flyMs: 240,
} as const;

/** How long a tap with `waves` waves takes to play out on screen. */
export function chainMs(waves: number): number {
  return DOTSCLASH_CONFIG.landMs + waves * DOTSCLASH_CONFIG.waveMs;
}

/** Cells per side for a game of `players`. */
export function boardSizeFor(players: number): number {
  const sizes = DOTSCLASH_CONFIG.boardSizes;
  return sizes[Math.min(players, sizes.length - 1)]!;
}
