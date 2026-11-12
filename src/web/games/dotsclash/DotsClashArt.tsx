import { clsx } from "clsx";
import { playerStyle } from "../../utils/playerStyle";
import { DotPips } from "./DotPips";

/** A corner of a board mid-game, as [player, dots] or null: red about to burst into blue's tiles. */
const PREVIEW: readonly ([number, number] | null)[] = [
  [0, 3], [1, 1], null,
  [0, 1], [1, 2], [1, 3],
  null, [2, 2], null,
];

const SIZE = 3;

/** A small copy of the board: rounded tiles, the taken ones in their owner's light color with their dots (1, 2, a triangle of 3). */
export function DotsClashArt() {
  return (
    <div className="grid size-full gap-1" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }} aria-hidden="true">
      {PREVIEW.map((cell, index) => (
        <span
          key={index}
          className={clsx("relative rounded-art-cell border-thin border-ink", cell ? "bg-player" : "bg-white")}
          style={cell ? playerStyle(cell[0]) : undefined}
        >
          {cell && <DotPips count={cell[1]} />}
        </span>
      ))}
    </div>
  );
}
