import { clsx } from "clsx";
import { formatClock } from "../../../utils/arenaText";

/** Time left, in a white pill; turns coral for the last 10 seconds. */
export function MatchClock({ msLeft }: { msLeft: number }) {
  const ending = msLeft <= 10_000;
  return (
    <span
      className={clsx(
        "inline-flex min-w-icon-button items-center justify-center rounded-pill border-thin border-ink px-3 py-2 font-bold tabular-nums",
        ending ? "bg-coral text-white" : "bg-white text-ink",
      )}
    >
      {formatClock(msLeft)}
    </span>
  );
}
