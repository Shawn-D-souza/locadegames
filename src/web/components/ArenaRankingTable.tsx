import type { Arena, ArenaResult } from "../../shared/arena/types";
import type { PlayerId } from "../../shared/rooms/types";
import { arenaName, formatClock, formatShare } from "../utils/arenaText";
import { playerStyle } from "../utils/playerStyle";
import { Badge } from "./Badge";

interface ArenaRankingTableProps {
  arena: Arena;
  myId: PlayerId;
}

/** What a result shows: land for those still in at the end, how long the others lasted. */
function resultText(r: ArenaResult): string {
  if (r.survivedMs === null) return formatShare(r.landShare);
  return r.quit ? `QUIT ${formatClock(r.survivedMs)}` : `OUT ${formatClock(r.survivedMs)}`;
}

/** Final order of a real-time match: a bar per player in their color with place, name and result. */
export function ArenaRankingTable({ arena, myId }: ArenaRankingTableProps) {
  return (
    <ol className="flex w-full flex-col gap-3">
      {arena.results.map((r) => (
        <li
          key={r.id}
          className="flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player pr-4 pl-3 text-player-text max-phone:gap-2 max-phone:pr-3 max-phone:pl-2"
          style={playerStyle(r.id)}
        >
          <span className="inline-flex size-avatar-small flex-none items-center justify-center rounded-pill border-thin border-ink bg-white font-display font-black text-ink">
            {r.place}
          </span>
          <span className="min-w-0 flex-1 truncate max-phone:text-caption">{arenaName(arena, r.id)}</span>
          {r.id === myId && <Badge tone="ink">YOU</Badge>}
          <span className="flex-none font-bold whitespace-nowrap">{resultText(r)}</span>
        </li>
      ))}
    </ol>
  );
}
