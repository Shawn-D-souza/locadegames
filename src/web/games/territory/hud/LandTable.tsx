import { clsx } from "clsx";
import type { PlayerId } from "../../../../shared/rooms/types";
import { formatShare } from "../../../utils/arenaText";
import { playerStyle } from "../../../utils/playerStyle";
import { TERRITORY_CLIENT_CONFIG } from "../config";

interface LandTableProps {
  shares: { id: PlayerId; share: number }[];
  names: ReadonlyMap<PlayerId, string>;
  myId: PlayerId;
}

/** Live land shares in the top corner: a small bar per player in their color, best first; you always show. */
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
          <span className="w-4 flex-none font-display font-black">{shares.indexOf(row) + 1}</span>
          <span className="min-w-0 flex-1 truncate">{names.get(row.id)}</span>
          <span className="flex-none font-bold">{formatShare(row.share)}</span>
        </li>
      ))}
    </ol>
  );
}
