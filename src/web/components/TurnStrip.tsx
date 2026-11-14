import { clsx } from "clsx";
import type { PlayerId } from "../../shared/rooms/types";
import { playerStyle, quitStyle } from "../utils/playerStyle";

export interface StripPlayer {
  id: PlayerId;
  name: string;
  /** Knocked out (no dots left) or quit: faded and small. */
  out: boolean;
  /** Quit: grey, like their pieces left on the board. */
  quit: boolean;
  /** Finished, in this place (Snakes & Ladders: home 1st, 2nd …): shown on their tile. */
  place?: number | null;
}

interface TurnStripProps {
  /** Everyone in the game, in turn order. */
  players: StripPlayer[];
  /** Who the game waits for: whose turn it is, or everyone still picking. */
  activeIds: readonly PlayerId[];
  myId: PlayerId;
  /** In landscape, wrap into lines of 4, the last line centered (the column beside a big board). */
  wrap?: boolean;
  /** tile: rounded squares, like Dots Clash's tiles · disc: round, like Snakes & Ladders' pieces. */
  shape?: "tile" | "disc";
}

const SHAPE_CLASSES = { tile: "rounded-[22%]", disc: "rounded-pill border-thin border-ink" } as const;

/**
 * Every player as a small tile (or disc) in their color, in turn order, above the board of a game everyone plays
 * together: so you see who is who on the board without a player list (owner decision: no list, there's no room for 8).
 * Whose turn it is stands bigger and hops (while picking, everyone who hasn't picked yet); your tile has YOU under it;
 * players who are out shrink and fade; players who finished show their place.
 */
export function TurnStrip({ players, activeIds, myId, wrap = false, shape = "tile" }: TurnStripProps) {
  return (
    <ol className={clsx("flex items-start justify-center gap-3 pt-2", wrap && "landscape:flex-wrap landscape:gap-x-0")} aria-label="Turn order">
      {players.map((player) => {
        const now = activeIds.includes(player.id);
        return (
          <li
            key={player.id}
            className={clsx("flex flex-col items-center gap-2", wrap && "landscape:basis-1/4")}
            style={player.quit ? quitStyle() : playerStyle(player.id)}
            aria-label={`${player.name}${player.id === myId ? " (you)" : ""}${now ? ", playing now" : player.place ? `, finished ${player.place}` : player.out ? ", out" : ""}`}
            aria-current={now ? "step" : undefined}
          >
            <span
              className={clsx(
                "flex size-6 items-center justify-center bg-player font-display text-caption font-black text-player-text transition-[scale,opacity] duration-slow ease-spring",
                SHAPE_CLASSES[shape],
                now && "scale-(--transform-turn-scale) animate-turn-hop",
                player.out && "scale-(--transform-pop-from-scale) opacity-disconnected",
              )}
            >
              {player.place ?? null}
            </span>
            <span className={clsx("font-display text-caption font-black text-ink", player.id !== myId && "invisible")} aria-hidden="true">
              YOU
            </span>
          </li>
        );
      })}
    </ol>
  );
}
