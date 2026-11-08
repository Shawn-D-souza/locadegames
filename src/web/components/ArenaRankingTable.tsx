import { clsx } from "clsx";
import type { Arena } from "../../shared/arena/types";
import type { PlayerId } from "../../shared/rooms/types";
import { arenaName } from "../utils/arenaText";
import { playerStyle } from "../utils/playerStyle";
import { ArenaResultValue } from "./ArenaResultValue";
import { Badge } from "./Badge";
import { PlaceDisc } from "./PlaceDisc";

interface ArenaRankingTableProps {
  arena: Arena;
  myId: PlayerId;
}

/**
 * Final order of a real-time match: a bar per player in their color with their place (gold, silver, bronze),
 * name and result (land share if still in, else how long they lasted).
 */
export function ArenaRankingTable({ arena, myId }: ArenaRankingTableProps) {
  return (
    <ol className="flex w-full flex-col gap-3">
      {arena.results.map((r) => (
        <li
          key={r.id}
          className={clsx(
            "flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player pr-4 pl-3 text-player-text max-phone:gap-2 max-phone:pr-3 max-phone:pl-2",
          )}
          style={playerStyle(r.id)}
        >
          <PlaceDisc place={r.place} />
          <span className="min-w-0 flex-1 truncate max-phone:text-caption">
            {arenaName(arena, r.id)}
          </span>
          {r.id === myId && <Badge tone="ink">YOU</Badge>}
          <ArenaResultValue result={r} />
        </li>
      ))}
    </ol>
  );
}
