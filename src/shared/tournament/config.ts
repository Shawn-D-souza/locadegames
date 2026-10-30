/** Points per result. A bye counts as a win, so sitting out never costs anyone. */
export const TOURNAMENT_CONFIG = {
  winPoints: 2,
  drawPoints: 1,
  byePoints: 2,
  /**
   * Rounds after the first start this long after the previous round ends, at one shared server
   * time: every phone shows its result (client `resultShowMs`, shorter than this), then a round
   * intro, and all matches begin together. The turn clock starts then; earlier moves are refused.
   */
  roundBreakMs: 7_000,
} as const;
