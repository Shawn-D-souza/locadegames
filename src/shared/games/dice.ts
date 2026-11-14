/**
 * The die shared by the games that roll one (Snakes & Ladders, Ludo): how long a roll takes to show on every phone, and
 * the die itself, rolled by the server from a fresh random number (never from anything a phone could know ahead).
 */
export const DICE_CONFIG = {
  /** The die tumbles and bounces to a stop. */
  dieMs: 1_050,
  /** A beat with its face showing before anything moves. */
  settleMs: 320,
} as const;

/** A die from the server's random number: 1–6. */
export function dieFrom(seed: number): number {
  return 1 + ((seed >>> 0) % 6);
}

/** A die a playtest asked for, `{ die }`, only on a dev server with loaded dice; null otherwise or if malformed. */
export function loadedDie(raw: unknown, loadedDice: boolean): number | null {
  if (!loadedDice || typeof raw !== "object" || raw === null || !("die" in raw)) return null;
  const die = raw.die;
  return typeof die === "number" && Number.isInteger(die) && die >= 1 && die <= 6 ? die : null;
}
