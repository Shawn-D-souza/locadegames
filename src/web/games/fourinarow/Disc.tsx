import { clsx } from "clsx";
import type { Seat } from "../../../shared/games/types";
import { isRinged } from "./discMark";

/** Marks inside a disc, in a 100-unit box: the ring well inside, a winning disc's white band inside its edge. */
const MARKS = { ring: 20, ringWidth: 6, band: 38, bandWidth: 10 } as const;

interface DiscProps {
  seat: Seat;
  /** Whose phone it is (their seat, or null watching): your own discs carry the ring. */
  viewer: Seat | null;
  /** On the winning line: a white band, so it stands out on the board in the winner's color. */
  lit?: boolean;
  className?: string;
}

/**
 * A 4 in a Row disc in its player's color (`--player`) with the same ink outline as a hole (a round box with the
 * `thin` border, not a drawn circle), so in a hole it lies exactly over the hole's outline: one line, nothing showing
 * between them (owner direction). Your own have a ring pressed in, in your dark color (owner decision: one side's discs
 * plain, the other's with a subtle mark, so they can be told apart without color).
 */
export function Disc({ seat, viewer, lit = false, className }: DiscProps) {
  return (
    <span className={clsx("block rounded-pill border-thin border-ink bg-player", className)}>
      <svg className="size-full" viewBox="0 0 100 100" aria-hidden="true">
        {/* Drawn round as the win line draws (the same dash trick as the line). */}
        {lit && (
          <circle
            cx={50}
            cy={50}
            r={MARKS.band}
            className="animate-win-line fill-none stroke-white"
            strokeWidth={MARKS.bandWidth}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
        )}
        {isRinged(seat, viewer) && <circle cx={50} cy={50} r={MARKS.ring} className="fill-none stroke-player-dark opacity-disc-ring" strokeWidth={MARKS.ringWidth} />}
      </svg>
    </span>
  );
}
