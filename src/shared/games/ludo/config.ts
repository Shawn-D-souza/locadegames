import { DICE_CONFIG } from "../dice";
import type { LudoAction, LudoStep } from "./types";

/**
 * Ludo's boards (owner decision: the board grows with the room, so up to 8 play on one board, each on their own arm):
 * the classic cross for 2–4 players, a 6-arm star for 5–6, an 8-arm star for 7–8. Each arm is 3 squares wide; the
 * bigger boards' arms are shorter, so a pawn's trip round is about the classic one's length (56–57 moves) and the
 * squares stay about the same size on a phone.
 */
export const LUDO_BOARDS: readonly { upTo: number; arms: number; armLength: number }[] = [
  { upTo: 4, arms: 4, armLength: 6 },
  { upTo: 6, arms: 6, armLength: 4 },
  { upTo: 8, arms: 8, armLength: 3 },
];

/** Gameplay numbers for Ludo. */
export const LUDO_CONFIG = {
  minPlayers: 2,
  /** Each roll, and each choice of pawn, must be made within this time, or the server plays it (owner decision: classic Ludo, 30 s like Snakes & Ladders). */
  turnTimeMs: 30_000,
  /** Pawns per player (owner decision: always 4, however many play). */
  pawns: 4,
  /** A 6 rolls again; this many in a row end the turn, that roll not played. */
  sixesLimit: 3,
  /** The die needed to bring a pawn out of its base (owner decision: only a 6). */
  enterDie: 6,
  /**
   * How a move plays out on every phone (the die's own timings are the shared die's): a pawn leaving its base flies to
   * its start square; a move hops square by square; pawns captured fly back to their bases once it has landed; the
   * third 6 in a row shakes the die a moment. The next turn's clock starts once it has played out.
   */
  ...DICE_CONFIG,
  hopMs: 260,
  enterMs: 650,
  captureMs: 900,
  threeSixesMs: 700,
} as const;

/** How long a pawn's move takes to play out: hops (or flying out of its base), then any captured pawns flying home. */
export function stepMs(step: LudoStep): number {
  const { hopMs, enterMs, captureMs } = LUDO_CONFIG;
  return (step.from < 0 ? enterMs : (step.to - step.from) * hopMs) + (step.captured.length > 0 ? captureMs : 0);
}

/** How long an action takes to play out on screen: the die (when it was rolled), then the pawn's move, if any. */
export function actionMs(action: LudoAction): number {
  const { dieMs, settleMs, threeSixesMs } = LUDO_CONFIG;
  const die = action.rolled ? dieMs + settleMs : 0;
  if (action.outcome === "threeSixes") return die + threeSixesMs;
  return die + (action.step ? stepMs(action.step) : 0);
}
