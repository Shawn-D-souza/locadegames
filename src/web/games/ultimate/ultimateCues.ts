import { durations } from "../../../theme";
import { boardOf } from "../../../shared/games/ultimate/rules";
import type { Seat, UltimateState } from "../../../shared/games/ultimate/types";
import type { SoundStep } from "../../sound/soundBook";
import { lastMarkSound } from "./sounds";

/** When a closed small board's own sound starts: once the move's mark has popped in, as a won board's line starts (its stamp comes later, inside the sound). */
export const CLAIM_SOUND_AT = durations.slow;

/**
 * What a move sounds like as it lands, for whoever is looking (`viewer`: your seat, or null watching): its mark, and,
 * if it closed its small board, the big mark stamping on (yours or theirs) or the board going quiet (full, no line).
 */
export function ultimateMoveSteps(previous: UltimateState, game: UltimateState, viewer: Seat | null): SoundStep[] {
  const mark = lastMarkSound(game);
  if (!mark || game.lastMove === null) return [];
  const steps: SoundStep[] = [{ sound: mark.sound, variant: mark.variant, at: 0 }];
  const board = boardOf(game.lastMove);
  const closed = game.boards[board];
  if (previous.boards[board] !== null || closed === null) return steps;
  if (closed === "draw") steps.push({ sound: "ultimateBoardFilledUp", at: CLAIM_SOUND_AT });
  else steps.push({ sound: closed === viewer ? "ultimateYouClaimedBoard" : "ultimateBoardClaimed", at: CLAIM_SOUND_AT });
  return steps;
}
