import { clsx } from "clsx";
import { SNAKESLADDERS_CONFIG } from "../../../shared/games/snakesladders/config";
import { DIE_FLIPS, dieAt } from "./dieMotion";

/** Where each face's pips sit on a 3 × 3 grid (0–8, reading order). */
const PIPS: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface DieProps {
  /** The face it shows (1–6), or null before anyone has rolled. */
  face: number | null;
  /** How far into its tumble (ms), or null at rest. */
  tumbleMs: number | null;
  /** Shown big (your own bar) or small. */
  className?: string;
}

/**
 * The die, like the logo's: white, ink pips, outlined with a small lip. A roll throws it: it hops, then tumbles over
 * its edges a quarter turn at a time, a new face each time (the same on every phone, `dieAt`), and comes to rest on
 * the face rolled.
 */
export function Die({ face, tumbleMs, className }: DieProps) {
  const tumbling = tumbleMs !== null && tumbleMs < SNAKESLADDERS_CONFIG.dieMs;
  const motion = tumbling ? dieAt(tumbleMs) : { lift: 0, turn: 0, flips: 0 };
  // A new face every quarter turn (the same on every phone), settling on the roll as it tips over for the last time.
  const shown = tumbling && motion.flips < DIE_FLIPS ? ((((face ?? 1) + DIE_FLIPS - motion.flips) % 6) + 1) : face;
  return (
    <span
      className={clsx(
        "grid aspect-square flex-none grid-cols-3 grid-rows-3 gap-1 rounded-[22%] border-thin border-ink bg-white p-2 shadow-lip-small",
        !tumbling && face !== null && "animate-dot-land",
        className,
      )}
      style={{ rotate: `${motion.turn}deg`, translate: `0 ${-motion.lift * 100}%` }}
      role="img"
      aria-label={face === null ? "Die" : tumbling ? "Die rolling" : `Die: ${face}`}
    >
      {Array.from({ length: 9 }, (_, spot) => (
        <span key={spot} className={clsx("rounded-pill", shown !== null && PIPS[shown]!.includes(spot) && "bg-ink")} />
      ))}
    </span>
  );
}
