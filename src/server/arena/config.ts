import { TERRITORY_CONFIG } from "../../shared/games/territory/config";

/** Server-side numbers for real-time matches. */
export const ARENA_SERVER_CONFIG = {
  /** How often the match loop wakes; twice per step, so a snapshot leaves at most half a step late. */
  loopIntervalMs: TERRITORY_CONFIG.tickMs / 2,
  /** After a stall longer than this many steps, the lost time is skipped rather than replayed. */
  maxCatchUpTicks: 20,
  /** Inputs stamped further ahead than this are treated as meant for this many steps ahead. */
  maxInputLeadTicks: 40,
  /** Inputs waiting per player; more are dropped (a well-behaved client sends at most one per step). */
  maxQueuedInputs: 64,
  /** Largest binary frame a client may send. */
  maxBinaryBytes: 64,
} as const;
