import { clsx } from "clsx";
import { playerStyle } from "../utils/playerStyle";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

interface PlayerBarProps {
  player: { id: number; name: string; connected: boolean; trophies: number };
  isYou: boolean;
  isHost: boolean;
}

const BADGE_ICON_CLASSES = "size-(--type-badge-size)";

/**
 * Full-width bar in the player's color: name, then badges (YOU, HOST, AWAY, trophies).
 * Badges carry their own white or ink fill, so they read on every player color.
 */
export function PlayerBar({ player, isYou, isHost }: PlayerBarProps) {
  return (
    // The name is white or ink, whichever reads better on this player's color.
    <li
      className={clsx(
        "flex min-h-tap animate-pop-in items-center gap-3 rounded-control border-thin border-ink bg-player pr-3 pl-4 text-player-text max-phone:gap-2 max-phone:pr-2 max-phone:pl-3",
        !player.connected && "opacity-disconnected",
      )}
      style={playerStyle(player.id)}
    >
      <span className="min-w-0 flex-1 truncate">{player.name}</span>
      <span className="flex shrink-0 gap-1">
        {isYou && <Badge tone="ink">YOU</Badge>}
        {isHost && (
          <Badge tone="white">
            <Icon name="crown" className={BADGE_ICON_CLASSES} />
            {/* Small phones: just the crown, so the name has room. */}
            <span className="max-phone:sr-only">HOST</span>
          </Badge>
        )}
        {!player.connected && <Badge tone="white">AWAY</Badge>}
        {player.trophies > 0 && (
          <Badge tone="white">
            <Icon name="trophy" className={BADGE_ICON_CLASSES} />
            <span aria-label={`${player.trophies} tournament wins`}>{player.trophies}</span>
          </Badge>
        )}
      </span>
    </li>
  );
}
