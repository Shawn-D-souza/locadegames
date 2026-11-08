import { clsx } from "clsx";
import type { Standing } from "../../shared/tournament/types";
import { playerStyle } from "../utils/playerStyle";
import { Badge } from "./Badge";
import { PlaceDisc } from "./PlaceDisc";

interface StandingsTableProps {
  standings: Standing[];
  myId: number;
}

/**
 * Points table: a bar per player in their color (like the room's player bars) with place (gold, silver,
 * bronze), name and points. Level points share a place; players who left are
 * greyed with a dash for a place.
 */
export function StandingsTable({ standings, myId }: StandingsTableProps) {
  return (
    <ol className="flex w-full flex-col gap-3">
      {standings.map((s) => (
        <li
          key={s.id}
          className={clsx(
            "flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player pr-4 pl-3 text-player-text max-phone:gap-2 max-phone:pr-3 max-phone:pl-2",
            s.place === null && "opacity-disconnected",
          )}
          style={playerStyle(s.id)}
        >
          <PlaceDisc place={s.place} />
          {/* One size down on small phones, so a name fits next to YOU (still readable: the caption size). */}
          <span className="min-w-0 flex-1 truncate max-phone:text-caption">
            {s.name}
          </span>
          {s.id === myId && <Badge tone="ink">YOU</Badge>}
          <span className="flex-none font-display text-title font-black" aria-label={`${s.points} points`}>
            {s.points}
          </span>
        </li>
      ))}
    </ol>
  );
}
