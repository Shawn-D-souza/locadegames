import { DICE_CONFIG } from "../dice";
import type { SnakesRoll } from "./types";

/** Gameplay numbers for Snakes & Ladders. */
export const SNAKESLADDERS_CONFIG = {
  minPlayers: 2,
  /** Each roll must be made within this time, or the server rolls for you (owner decision: 30 s). */
  turnTimeMs: 30_000,
  /** The last square: reach it exactly to finish (owner decision: a roll that would go past it doesn't move you). */
  finish: 100,
  /** Squares per row; the rows wind up the board, the first left to right. */
  columns: 10,
  /** A 6 rolls again; this many in a row cancel the whole turn (owner decision: back where the turn began, not the start). */
  sixesLimit: 3,
  /**
   * How a roll plays out on every phone (owner direction: slow enough to enjoy): the die tumbles and bounces to a stop,
   * a beat with its face showing, then the piece hops square by square, then climbs a ladder or slides down a snake.
   * The next roll's clock starts once it has played out, so nobody's time goes on watching it.
   */
  ...DICE_CONFIG,
  hopMs: 290,
  climbMs: 1_150,
  slideMs: 1_600,
  /** A roll that would go past the last square: the piece shakes where it is. */
  stuckMs: 700,
  /** The third 6 in a row: the piece flies back to where the turn began. */
  backMs: 1_250,
} as const;

/** How long a roll takes to play out on screen. */
export function rollMs(roll: SnakesRoll): number {
  const { dieMs, settleMs, hopMs, climbMs, slideMs, stuckMs, backMs } = SNAKESLADDERS_CONFIG;
  const shown = dieMs + settleMs;
  switch (roll.kind) {
    case "stuck":
      return shown + stuckMs;
    case "threeSixes":
      return shown + backMs;
    case "ladder":
      return shown + (roll.landed - roll.from) * hopMs + climbMs;
    case "snake":
      return shown + (roll.landed - roll.from) * hopMs + slideMs;
    case "move":
      return shown + (roll.landed - roll.from) * hopMs;
  }
}
