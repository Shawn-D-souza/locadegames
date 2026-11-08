import type { PlayerId } from "../../../../shared/rooms/types";

/** Who leads in land (and wears the crown): the most land; no one while the top is a tie or nobody has any. */
export function leaderOf(lands: Iterable<{ id: PlayerId; area: number }>): PlayerId | null {
  let best: PlayerId | null = null;
  let bestArea = 0;
  let tied = false;
  for (const { id, area } of lands) {
    if (area > bestArea) {
      best = id;
      bestArea = area;
      tied = false;
    } else if (area === bestArea) tied = true;
  }
  return tied ? null : best;
}
