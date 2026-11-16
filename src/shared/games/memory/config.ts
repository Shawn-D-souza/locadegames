/** Gameplay numbers for Memory. */
export const MEMORY_CONFIG = {
  minPlayers: 2,
  /** Each card must be turned within this time (owner decision: 30 s), or the turn passes on with no card turned for you (owner decision, like Pool). */
  turnTimeMs: 30_000,
  /** This many turns run out in a row puts you out, as if you'd quit (owner decision, like Pool: nobody away keeps a game going for hours). */
  missedTurnsOut: 3,
  /**
   * Cards across × down by how many play (owner decision: 8 pairs for 2 players was far too short, 18–24 a little too
   * long): 2 → 6 × 5 (15 pairs), 3–4 → 6 × 6 (18), 5–8 → 6 × 7 (21 pairs, 2–3 each with 8). Six across everywhere, so a
   * card stays about 50 px on a phone. Index = player count; anything above the last uses the last.
   */
  grids: [
    [6, 5],
    [6, 5],
    [6, 5],
    [6, 6],
    [6, 6],
    [6, 7],
    [6, 7],
    [6, 7],
    [6, 7],
  ],
  /**
   * About this share of the pairs are different pictures; the rest are a picture already in the game again in another
   * color (owner decision: a different color is a different pair, to confuse). 15 pairs → 10 pictures, 21 → 14 (the
   * groups always have that many; a bigger board could run out, and then a picture would come in a third color).
   */
  pictureShare: 2 / 3,
  /** At most this many pictures from one group in a game (owner decision: one or two, never a whole group). */
  perGroup: 2,
  /** A card turning over on every phone. */
  flipMs: 220,
  /** A pair found pops before the same player turns their next card. */
  pairMs: 450,
  /** Two cards that don't match stay face up this long for everyone to see, then turn back (`flipMs`). */
  missShowMs: 1_500,
} as const;

/** Cards across and down for a game of `players`. */
export function gridFor(players: number): { cols: number; rows: number } {
  const grids = MEMORY_CONFIG.grids;
  const [cols, rows] = grids[Math.min(players, grids.length - 1)]!;
  return { cols, rows };
}

/** How long a turned card takes to play out on screen: the next card's clock starts after it. */
export function flipPlayOutMs(cardsTurned: number, matched: boolean): number {
  const { flipMs, pairMs, missShowMs } = MEMORY_CONFIG;
  if (cardsTurned < 2) return flipMs;
  return matched ? flipMs + pairMs : flipMs + missShowMs + flipMs;
}
