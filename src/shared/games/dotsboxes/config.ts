/** Gameplay numbers for Dots & Boxes. */
export const DOTSBOXES_CONFIG = {
  minPlayers: 2,
  /** Each line must be drawn within this time, or one is drawn for you (owner decision: 30 s). A box won means another line, on a fresh clock. */
  turnTimeMs: 30_000,
  /**
   * Boxes per side by how many play (my call, owner approved the sizes): 2 → 5×5, 3–4 → 6×6, 5–6 → 7×7, 7–8 → 8×8
   * (64 boxes, 144 lines: about 35px a box on a 320px phone). Index = player count; anything above the last uses the last.
   */
  boardSizes: [5, 5, 5, 6, 6, 7, 7, 8, 8],
  /** A line drawing in on every phone; the next line's clock starts after it. */
  lineMs: 200,
  /** A box won fills in after its line: the clock waits for that too. */
  boxMs: 300,
} as const;

/** Boxes per side for a game of `players`. */
export function boardSizeFor(players: number): number {
  const sizes = DOTSBOXES_CONFIG.boardSizes;
  return sizes[Math.min(players, sizes.length - 1)]!;
}

/** How long a line (and the boxes it won) takes to play out on screen. */
export function lineMs(boxesWon: number): number {
  return DOTSBOXES_CONFIG.lineMs + (boxesWon > 0 ? DOTSBOXES_CONFIG.boxMs : 0);
}
