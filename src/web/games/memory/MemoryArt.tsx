import type { PictureId } from "../../../shared/games/memory/pictures";
import { playerStyle } from "../../utils/playerStyle";
import { CardBackMark } from "./CardBackMark";
import { Picture } from "./Picture";

/**
 * Three by three cards, most face down; face up, a pair of red stars just found and a blue knight waiting for its
 * partner, so it reads as Memory in play. Each card lies a little askew (turned a few degrees, nudged a few percent of
 * its size), like cards laid out by hand on a table (owner direction: set apart from the other tiles' tidy grids; owner's
 * pick of the layouts tried, with room between the cards so the tilts look meant, not crowded). Fixed, never random.
 */
const CARDS: readonly { face: { picture: PictureId; color: number } | null; turn: number; x: number; y: number }[] = [
  { face: null, turn: 7, x: -3, y: 4 },
  { face: { picture: "star", color: 0 }, turn: -4, x: 0, y: -3 },
  { face: null, turn: 3, x: 4, y: 2 },
  { face: { picture: "knight", color: 1 }, turn: -5, x: -4, y: -2 },
  { face: null, turn: 2, x: 0, y: 3 },
  { face: null, turn: -8, x: 3, y: -4 },
  { face: null, turn: -3, x: -2, y: -3 },
  { face: null, turn: 6, x: 2, y: 2 },
  { face: { picture: "star", color: 0 }, turn: 4, x: 3, y: 4 },
];

/** Each card's size in its spot: smaller than the spot, so tilted cards keep clear space round them. */
const CARD_SCALE = 0.86;

/** The game tile: a small table of cards, as above. */
export function MemoryArt() {
  return (
    <div className="grid size-full grid-cols-3 gap-1" aria-hidden="true">
      {CARDS.map(({ face, turn, x, y }, i) => {
        const askew = { rotate: `${turn}deg`, translate: `${x}% ${y}%`, scale: CARD_SCALE };
        return face === null ? (
          <span key={i} className="relative rounded-art-cell border-thin border-ink bg-memory-back" style={askew}>
            <CardBackMark />
          </span>
        ) : (
          <span key={i} className="rounded-art-cell border-thin border-ink bg-white p-[8%]" style={{ ...askew, ...playerStyle(face.color) }}>
            <Picture picture={face.picture} className="size-full" />
          </span>
        );
      })}
    </div>
  );
}
