import { MEMORY_CONFIG } from "../../../shared/games/memory/config";
import type { MemoryTimeout } from "../../../shared/games/memory/types";

/**
 * What a turn running out says (like Pool's): yours, with a warning on the last but one; someone else's, by name
 * (`ANA`, in capitals). Pure.
 */
export function timeoutNotice(timeout: MemoryTimeout, mine: boolean, name: string): string {
  const limit = MEMORY_CONFIG.missedTurnsOut;
  if (timeout.out) return mine ? `${limit} TURNS MISSED! YOU'RE OUT` : `${name} MISSED ${limit} TURNS: OUT!`;
  if (mine && timeout.missed === limit - 1) return "OUT OF TIME! ONE MORE: YOU'RE OUT";
  return mine ? "OUT OF TIME! TURN OVER" : `${name} RAN OUT OF TIME`;
}
