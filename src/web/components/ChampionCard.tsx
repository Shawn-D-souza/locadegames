import { clsx } from "clsx";
import type { Tournament } from "../../shared/tournament/types";
import { playerStyle } from "../utils/playerStyle";
import { entrantName } from "../utils/tournamentText";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { TabCard } from "./TabCard";

interface ChampionCardProps {
  tournament: Tournament;
  myId: number;
}

const CROWN_CLASSES = "fill-waiting stroke-ink";

/** The tab: "CHAMPION!", or for a shared title "SHARED TITLE!" ("DRAW! SHARED TITLE" after a drawn 2-player match). */
function headline(t: Tournament): string {
  if (t.championIds.length === 1) return "Champion!";
  return t.entrants.length === 2 ? "Draw! Shared title" : "Shared title!";
}

/**
 * The results' hero, with the headline as an ink tab on its top edge. One champion: the card in their color,
 * their avatar crowned on a white disc, the big name and YOU beside it. A shared title: a white card with a
 * crowned bar per champion in their color (like the room's player bars), so nobody's color wins.
 */
export function ChampionCard({ tournament, myId }: ChampionCardProps) {
  const ids = tournament.championIds;
  const solo = ids.length === 1 ? ids[0]! : null;
  return (
    <TabCard
      title={headline(tournament)}
      reveal
      className={clsx("gap-3", solo === null ? "bg-white text-ink" : "bg-player text-player-text")}
      style={solo === null ? undefined : playerStyle(solo)}
    >
        {solo !== null ? (
          <div className="flex items-center justify-center gap-4">
            <span className="relative inline-flex flex-none rounded-pill border-thin border-ink bg-white p-1">
              <Avatar name={entrantName(tournament, solo)} colorIndex={solo} />
              <Icon name="crown" className={clsx("absolute top-0 left-0 size-icon -translate-1/2 rotate-(--transform-badge-tilt)", CROWN_CLASSES)} />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1">
              <span className="line-clamp-2 max-w-full font-display text-title font-black wrap-break-word uppercase">{entrantName(tournament, solo)}</span>
              {solo === myId && <Badge tone="ink">YOU</Badge>}
            </span>
          </div>
        ) : (
          ids.map((id) => (
            <div
              key={id}
              className="flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player px-3 text-player-text"
              style={playerStyle(id)}
            >
              <Icon name="crown" className={clsx("size-icon flex-none", CROWN_CLASSES)} />
              <span className="min-w-0 flex-1 truncate">{entrantName(tournament, id)}</span>
              {id === myId && <Badge tone="ink">YOU</Badge>}
            </div>
          ))
        )}
    </TabCard>
  );
}
