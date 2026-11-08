import { clsx } from "clsx";
import type { PlayerId } from "../../../../shared/rooms/types";
import { playerStyle } from "../../../utils/playerStyle";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import { ShareNumber } from "../../../components/ShareNumber";

interface LandTableProps {
  shares: { id: PlayerId; share: number }[];
  names: ReadonlyMap<PlayerId, string>;
  myId: PlayerId;
}

/**
 * Live land shares in the top corner: a small bar per player in their color, best first; you always show.
 * The place and the share are in the game's number font (the countdown's and the result tag's), the
 * share's decimals smaller.
 */
export function LandTable({ shares, names, myId }: LandTableProps) {
  const top = shares.slice(0, TERRITORY_CLIENT_CONFIG.hud.leaderboardRows);
  const mine = shares.find((s) => s.id === myId);
  const rows = mine && !top.includes(mine) ? [...top, mine] : top;
  return (
    <ol className="flex w-hud-panel flex-col gap-1">
      {rows.map((row) => (
        <li
          key={row.id}
          className={clsx(
            "flex items-center gap-2 rounded-control border-thin border-ink bg-player px-2 py-1 text-caption text-player-text",
            row.id === myId && "shadow-lip-small",
          )}
          style={playerStyle(row.id)}
        >
          <span className="w-4 flex-none font-display text-label font-black">{shares.indexOf(row) + 1}</span>
          <span className="min-w-0 flex-1 truncate">{names.get(row.id)}</span>
          <ShareNumber share={row.share} size="small" />
        </li>
      ))}
    </ol>
  );
}
