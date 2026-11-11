import { HEADCRASH_CONFIG } from "../../shared/games/headcrash/config";

/** Server-side numbers for live 1v1 matches. */
export const DUEL_SERVER_CONFIG = {
  /** How often the match loop wakes; twice per step, so a step runs at most half a step late. */
  loopIntervalMs: HEADCRASH_CONFIG.tickMs / 2,
  /** After a stall longer than this many steps, the lost time is skipped rather than replayed. */
  maxCatchUpTicks: 30,
  /** Buttons stamped further ahead than this are treated as meant for this many steps ahead. */
  maxInputLeadTicks: 120,
  /** Button changes waiting per player; more are dropped. */
  maxQueuedInputs: 64,
  /** Largest binary frame a client may send. */
  maxBinaryBytes: 32,
} as const;
