import { clsx } from "clsx";
import { formatClock } from "../../../utils/arenaText";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/** Time left, in a white pill in the game's number font; turns coral for the last 10 seconds. */
export function MatchClock({ msLeft }: { msLeft: number }) {
  const ending = msLeft <= TERRITORY_CLIENT_CONFIG.hud.clockTicksFromS * 1000;
  return (
    <span
      className={clsx(
        "inline-flex min-w-icon-button items-center justify-center rounded-pill border-thin border-ink px-3 py-1 font-display text-title font-black tabular-nums",
        ending ? "bg-coral text-white" : "bg-white text-ink",
      )}
    >
      {formatClock(msLeft)}
    </span>
  );
}
