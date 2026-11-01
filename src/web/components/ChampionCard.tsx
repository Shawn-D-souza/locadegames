import { clsx } from "clsx";
import type { PlayerId } from "../../shared/rooms/types";
import { playerStyle } from "../utils/playerStyle";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { TabCard } from "./TabCard";

interface ChampionCardProps {
  championIds: PlayerId[];
  nameOf(id: PlayerId): string;
  /** A game of exactly two players: a shared title there is a draw. */
  twoPlayers: boolean;
  myId: PlayerId;
}

const CROWN_CLASSES = "fill-waiting stroke-ink";

/** The tab: "CHAMPION!", or for a shared title "SHARED TITLE!" ("DRAW! SHARED TITLE" after a drawn 2-player match). */
function headline(champions: number, twoPlayers: boolean): string {
  if (champions === 1) return "Champion!";
  return twoPlayers ? "Draw! Shared title" : "Shared title!";
}

/**
 * The results' hero, with the headline as an ink tab on its top edge. One champion: the card in their color,
 * their avatar crowned on a white disc, the big name and YOU beside it. A shared title: a white card with a
 * crowned bar per champion in their color (like the room's player bars), so nobody's color wins.
 */
export function ChampionCard({ championIds: ids, nameOf, twoPlayers, myId }: ChampionCardProps) {
  const solo = ids.length === 1 ? ids[0]! : null;
  return (
    <TabCard
      title={headline(ids.length, twoPlayers)}
      reveal
      className={clsx("gap-3", solo === null ? "bg-white text-ink" : "bg-player text-player-text")}
      style={solo === null ? undefined : playerStyle(solo)}
    >
        {solo !== null ? (
          <div className="flex items-center justify-center gap-4">
            <span className="relative inline-flex flex-none rounded-pill border-thin border-ink bg-white p-1">
              <Avatar name={nameOf(solo)} colorIndex={solo} />
              <Icon name="crown" className={clsx("absolute top-0 left-0 size-icon -translate-1/2 rotate-(--transform-badge-tilt)", CROWN_CLASSES)} />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1">
              <span className="line-clamp-2 max-w-full font-display text-title font-black wrap-break-word uppercase">{nameOf(solo)}</span>
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
              <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
              {id === myId && <Badge tone="ink">YOU</Badge>}
            </div>
          ))
        )}
    </TabCard>
  );
}
