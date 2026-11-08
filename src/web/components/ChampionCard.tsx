import { clsx } from "clsx";
import type { PlayerId } from "../../shared/rooms/types";
import { playerStyle } from "../utils/playerStyle";
import { Badge } from "./Badge";
import { GoldCrown } from "./GoldCrown";
import { TabCard } from "./TabCard";

interface ChampionCardProps {
  championIds: PlayerId[];
  nameOf(id: PlayerId): string;
  /** A game of exactly two players: a shared title there is a draw. */
  twoPlayers: boolean;
  myId: PlayerId;
}

/** The tab: "CHAMPION!", or for a shared title "SHARED TITLE!" ("DRAW! SHARED TITLE" after a drawn 2-player match). */
function headline(champions: number, twoPlayers: boolean): string {
  if (champions === 1) return "Champion!";
  return twoPlayers ? "Draw! Shared title" : "Shared title!";
}

/**
 * The results' hero, with the headline as an ink tab on its top edge. One champion: the card in their color,
 * their initial on a white disc with a gold crown dropping onto it and YOU on its bottom edge, and beside it
 * the big name. A shared title: a white card with a bar per champion in their color, each with a gold crown,
 * so nobody's color wins. The numbers are in the table below, not here (each says it once).
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
        <div className="flex items-center justify-center gap-6 pt-4 pb-2">
          <span className="relative flex-none">
            <span className="inline-flex size-avatar-hero items-center justify-center rounded-pill border-thin border-ink bg-white font-display text-title font-black text-ink uppercase">
              {[...nameOf(solo)][0] ?? "?"}
            </span>
            <GoldCrown className="absolute bottom-full left-1/2 w-crown-hero -translate-x-1/2 translate-y-1/3 animate-crown-on" />
            {solo === myId && (
              <Badge tone="ink" className="absolute top-full left-1/2 -translate-1/2">
                YOU
              </Badge>
            )}
          </span>
          <span className="line-clamp-2 min-w-0 font-display text-title font-black wrap-break-word uppercase">{nameOf(solo)}</span>
        </div>
      ) : (
        ids.map((id) => (
          <div
            key={id}
            className="flex min-h-tap items-center gap-3 rounded-control border-thin border-ink bg-player px-3 text-player-text"
            style={playerStyle(id)}
          >
            <GoldCrown className="w-icon" />
            <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
            {id === myId && <Badge tone="ink">YOU</Badge>}
          </div>
        ))
      )}
    </TabCard>
  );
}
