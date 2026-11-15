import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Cell } from "../../../shared/games/fourinarow/types";
import { playerStyle } from "../../utils/playerStyle";

const _ = null;

/**
 * A close-up of a game in the middle, 4 × 4 holes of the board rather than all 7 × 6, so the discs are big enough to
 * read on a tile (owner direction): red has three along the bottom and is about to drop the fourth on the left.
 */
const PREVIEW: readonly Cell[] = [
  _, _, _, _,
  _, _, _, 1,
  _, _, 1, 1,
  _, 0, 0, 0,
];
const COLUMNS = 4;

const COLUMNS_STYLE: CSSProperties = { gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` };

/** The real board drawn small: a white card of round holes in ink, discs in the first two player colors (too small for the ring to show). */
export function FourInARowArt() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden="true">
      <div className="grid w-full gap-1 rounded-art-cell border-thin border-ink bg-white p-1" style={COLUMNS_STYLE}>
        {PREVIEW.map((value, index) => (
          <span
            key={index}
            className={clsx("aspect-square rounded-pill border-thin border-ink", value === null ? "bg-background" : "bg-player")}
            style={value !== null ? playerStyle(value) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
