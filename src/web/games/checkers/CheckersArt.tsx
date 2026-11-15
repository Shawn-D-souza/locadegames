import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { playerStyle } from "../../utils/playerStyle";

const SIZE = 8;
const COLUMNS_STYLE: CSSProperties = { gridTemplateColumns: `repeat(${SIZE}, 1fr)` };

/**
 * The whole 8 × 8 board a few moves in (owner direction: the full board, so the tile can't be taken for the other
 * games' close-ups of cells and discs): `a` the first player's men, `b` the other's, one of each stepped out to face off.
 */
const POSITION = [
  ".b.b.b.b",
  "b.b...b.",
  ".b.b...b",
  "....b...",
  "...a....",
  "a...a.a.",
  ".a.a.a.a",
  "a.a.a.a.",
].join("");

/** The real board drawn small: its squares to the outline, plain pieces in the first two player colors. */
export function CheckersArt() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden="true">
      <div className="grid w-full overflow-hidden rounded-art-cell border-thin border-ink bg-white" style={COLUMNS_STYLE}>
        {[...POSITION].map((piece, index) => {
          const dark = (Math.floor(index / SIZE) + index) % 2 === 1;
          return (
            <span key={index} className={clsx("relative aspect-square", dark && "bg-checker-art-square")}>
              {piece !== "." && (
                <span className="absolute inset-[8%] rounded-pill border-hair border-ink bg-player" style={playerStyle(piece === "a" ? 0 : 1)} />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
