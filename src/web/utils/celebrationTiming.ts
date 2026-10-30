import { durations } from "../../theme";

/**
 * When a finished match's pieces play, in ms after it ended (matches `--line-at` / `--celebrate-at`
 * in global.css): the last mark pops in, the board thumps and holds still (the freeze), the win
 * line slashes through, then everything bursts.
 */
export const CELEBRATION_TIMING = {
  lineAt: durations.slow + durations.freeze,
  celebrateAt: durations.slow + durations.freeze + durations.lineDraw,
} as const;
