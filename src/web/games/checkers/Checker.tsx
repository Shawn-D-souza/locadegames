import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Seat } from "../../../shared/games/types";
import { GoldCrown } from "../../components/GoldCrown";
import { isRinged } from "../pieceMark";

/** Marks inside a piece, in a 100-unit box: the groove round its edge, and the ring pressed into your own. */
const MARKS = { groove: 36, grooveWidth: 4, ring: 18, ringWidth: 6 } as const;

interface CheckerProps {
  seat: Seat;
  /** Whose phone it is (their seat, or null watching): your own pieces carry the ring. */
  viewer: Seat | null;
  king?: boolean;
  /** Its crown pops on this many ms from now (a man just crowned), rather than being there already. */
  crownAtMs?: number | null;
  className?: string;
}

/**
 * A checkers piece in its player's color (`--player`) with an ink outline and a groove round its edge, like a turned
 * wooden piece seen from above. Your own have a ring pressed in, in your dark color, as in 4 in a Row (owner decision
 * for pieces told apart by color only). A king wears the platform's gold crown.
 */
export function Checker({ seat, viewer, king = false, crownAtMs = null, className }: CheckerProps) {
  const ringed = isRinged(seat, viewer);
  return (
    <span className={clsx("relative block rounded-pill border-thin border-ink bg-player", className)}>
      <svg className="size-full" viewBox="0 0 100 100" aria-hidden="true">
        {/* A crown covers the middle, so your own king's ring is its groove pressed deeper. */}
        <circle
          cx={50}
          cy={50}
          r={MARKS.groove}
          className={clsx("fill-none stroke-player-dark", ringed && king ? "opacity-disc-ring" : "opacity-groove")}
          strokeWidth={ringed && king ? MARKS.ringWidth : MARKS.grooveWidth}
        />
        {ringed && !king && (
          <circle cx={50} cy={50} r={MARKS.ring} className="fill-none stroke-player-dark opacity-disc-ring" strokeWidth={MARKS.ringWidth} />
        )}
      </svg>
      {king && (
        <span
          className={clsx("absolute inset-0 flex items-center justify-center", crownAtMs !== null && "animate-checker-crown")}
          style={crownAtMs !== null ? ({ "--crown-at": `${crownAtMs}ms` } as CSSProperties) : undefined}
        >
          <GoldCrown className="w-[64%]" />
        </span>
      )}
    </span>
  );
}
