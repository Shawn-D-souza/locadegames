import { clsx } from "clsx";
import type { MemoryFace } from "../../../shared/games/memory/types";
import { playerStyle, quitStyle } from "../../utils/playerStyle";
import { CardBackMark } from "./CardBackMark";
import { Picture } from "./Picture";

/** Who found a card's pair: their color (a player id), grey if they quit. */
export interface CardFinder {
  id: number;
  quit: boolean;
}

interface CardSideProps {
  /** The face, or null for the back. */
  face: MemoryFace | null;
  finder: CardFinder | null;
  className?: string;
}

/**
 * One side of a card. The back: deep indigo with a pale question mark pressed into it. The face: white, its picture in its
 * color; once found, on its finder's light wash, ringed in their color, the picture faded.
 */
export function CardSide({ face, finder, className }: CardSideProps) {
  if (face === null) {
    return (
      <span className={clsx("absolute inset-0 rounded-memory-card border-thin border-ink bg-memory-back", className)}>
        <CardBackMark />
      </span>
    );
  }
  return (
    <span
      className={clsx("absolute inset-0 rounded-memory-card border-thin border-ink", finder ? "bg-player-wash" : "bg-white", className)}
      style={finder ? (finder.quit ? quitStyle() : playerStyle(finder.id)) : undefined}
    >
      <span className={clsx("absolute inset-[9%]", finder && "opacity-defeated")} style={playerStyle(face.color)}>
        <Picture picture={face.picture} className="size-full" />
      </span>
      {finder && <span className="pointer-events-none absolute -inset-px rounded-memory-card border-outline-thick border-player" />}
    </span>
  );
}
