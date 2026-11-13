import { clsx } from "clsx";
import { playerStyle } from "../utils/playerStyle";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

interface SeatChipProps {
  player: { id: number; name: string; connected: boolean };
  isYou: boolean;
  /** Lit in the player's color: they must act now, or the winner once decided. */
  active: boolean;
  /** Seconds left, shown only near the end (null: not yet). */
  countdown: number | null;
  /** On the winner's own phone: a crown drops on and the chip bounces. */
  celebrate?: boolean;
  /** On the loser's own phone: a small sad shake, then it fades a little. */
  defeated?: boolean;
}

/** Small ink pill (the YOU / AWAY tab, the countdown). */
const PILL_CLASSES = "rounded-pill bg-ink px-2 py-1 text-badge tracking-badge text-white";

/**
 * A seat card made slim, for a game whose board needs the screen's height (Sea Battle): avatar, name and the last
 * seconds in one row, the YOU / AWAY tab on its top edge. Lit like a seat card: whoever must act, then the winner.
 */
export function SeatChip({ player, isYou, active, countdown, celebrate, defeated }: SeatChipProps) {
  const tab = !player.connected ? "AWAY" : isYou ? "YOU" : null;
  return (
    <div
      className={clsx(
        "relative flex min-h-icon-button min-w-0 items-center gap-2 rounded-control border-thin border-ink px-2",
        "transition-colors duration-normal ease-out",
        active ? "bg-player text-player-text" : "bg-white text-ink",
        celebrate && "animate-card-win",
        defeated && "animate-card-lose",
        !player.connected && "opacity-disconnected",
      )}
      style={playerStyle(player.id)}
    >
      {tab && <span className={clsx(PILL_CLASSES, "absolute top-0 left-1/2 -translate-1/2")}>{tab}</span>}
      {celebrate && (
        <Icon
          name="crown"
          className="absolute top-0 left-0 size-avatar-small translate-x-[-30%] -translate-y-1/2 rotate-(--transform-badge-tilt) animate-crown fill-waiting stroke-ink"
        />
      )}
      {/* Small phones: the name gets the room. */}
      <span className="flex max-phone:hidden">
        <Avatar name={player.name} colorIndex={player.id} small />
      </span>
      <span className="min-w-0 flex-1 truncate text-caption">{player.name}</span>
      <span
        className={clsx(PILL_CLASSES, "flex-none border-thin border-ink", countdown === null && "hidden")}
        role={countdown === null ? undefined : "timer"}
        aria-label={countdown === null ? undefined : `${countdown} seconds left`}
      >
        {countdown ?? 0}
      </span>
    </div>
  );
}
