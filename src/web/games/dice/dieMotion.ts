import { DICE_CONFIG } from "../../../shared/games/dice";

/**
 * How the die comes to rest, shared by its picture and its sound so every clack lands on a landing. Like a real die
 * (owner direction 2026-11-14: it bounced like a ball): thrown in, it lands and hops once, turning over twice in the
 * air, then tumbles over its edges a quarter turn at a time, each tumble a little quicker and lower, and lies still.
 * `at`: when it lands (a share of `dieMs`); `height`: how high it rises after that (a share of its own size; a die
 * tipping over its edge lifts by about a fifth); `quarters`: quarter turns until the next landing.
 */
export const DIE_HITS: readonly { at: number; height: number; quarters: number }[] = [
  { at: 0, height: 0.42, quarters: 2 },
  { at: 0.3, height: 0.2, quarters: 1 },
  { at: 0.45, height: 0.18, quarters: 1 },
  { at: 0.57, height: 0.15, quarters: 1 },
  { at: 0.67, height: 0.12, quarters: 1 },
  { at: 0.75, height: 0.08, quarters: 1 },
  { at: 0.82, height: 0, quarters: 0 },
];

/** Faces it shows on the way: a new one every quarter turn. */
export const DIE_FLIPS = DIE_HITS.reduce((sum, hit) => sum + hit.quarters, 0);

/** Where the die is `ms` into its roll: how high (share of its size), how far it still has to turn (degrees), and how many faces it has flicked through. */
export function dieAt(ms: number): { lift: number; turn: number; flips: number } {
  const p = Math.min(1, ms / DICE_CONFIG.dieMs);
  let hit = 0;
  while (hit + 1 < DIE_HITS.length && DIE_HITS[hit + 1]!.at <= p) hit++;
  const from = DIE_HITS[hit]!;
  const to = DIE_HITS[hit + 1]?.at ?? 1;
  const u = from.quarters ? (p - from.at) / (to - from.at) : 0;
  const done = DIE_HITS.slice(0, hit).reduce((sum, h) => sum + h.quarters, 0);
  // Turning over: the quarter turns of this hop, eased so it tips slowly and falls fast onto its face.
  const turned = done + from.quarters * u * u;
  return { lift: from.height * Math.sin(Math.PI * u), turn: -(DIE_FLIPS - turned) * 90, flips: done + Math.floor(from.quarters * u + 0.5) };
}
