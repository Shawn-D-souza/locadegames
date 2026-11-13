import { MARK, type CellMark } from "../../../shared/games/seabattle/types";
import { cellBox } from "./seaGeometry";
import { Smoke } from "./Smoke";

interface SeaMarksProps {
  marks: readonly CellMark[];
  /** Cells under a sunk ship (its smoke rises from its middle instead). */
  wrecked: ReadonlySet<number>;
  /** Where each sunk ship smokes (a cell in its middle). */
  smoking: readonly number[];
  /** The cell shot last: its mark comes in. */
  fresh: number | null;
}

/**
 * What each shot left, over the tiles and ships: a miss a ripple on the water where its tile sank; a hit, its burnt
 * tile smoking a little; a sunk ship, a fuller wisp off its middle.
 */
export function SeaMarks({ marks, wrecked, smoking, fresh }: SeaMarksProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {marks.map((mark, cell) => {
        if (mark === MARK.none || (mark === MARK.hit && wrecked.has(cell))) return null;
        return (
          <span key={cell} className="absolute flex items-center justify-center" style={cellBox(cell)}>
            {mark === MARK.miss ? (
              <span className={cell === fresh ? "size-1/2 animate-pop-in rounded-pill border-thin border-white opacity-secondary" : "size-1/2 rounded-pill border-thin border-white opacity-secondary"} />
            ) : (
              <Smoke big={false} seed={cell} />
            )}
          </span>
        );
      })}
      {smoking.map((cell) => (
        <span key={cell} className="absolute" style={cellBox(cell)}>
          <Smoke big seed={cell} />
        </span>
      ))}
    </div>
  );
}
