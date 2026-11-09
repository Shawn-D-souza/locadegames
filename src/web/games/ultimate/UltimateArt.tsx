import { clsx } from "clsx";
import type { Seat } from "../../../shared/games/types";
import { Mark } from "../../components/Mark";
import { playerStyle } from "../../utils/playerStyle";

type Square = { won: Seat } | { marks: readonly (Seat | null)[] };

const EMPTY: readonly null[] = Array.from({ length: 9 }, () => null);

/** A game in the middle: X has two small boards on the diagonal, O one; the rest still in play with a few marks. */
const PREVIEW: readonly Square[] = [
  { won: 0 },
  { marks: [null, 1, null, null, 0, null, null, null, null] },
  { won: 1 },
  { marks: [0, null, null, null, 1, null, null, null, 0] },
  { won: 0 },
  { marks: [null, null, 1, null, null, null, 0, null, null] },
  { marks: [null, null, null, 1, 0, null, null, null, null] },
  { marks: [1, null, null, null, null, null, null, 0, null] },
  { marks: EMPTY },
];

/**
 * The grid snaps its width down so all 9 cells across are whole pixels: its lines (the outline's 2 and the 2 between
 * small boards, all `thin`, plus 2 `hair` lines inside each small board) and a multiple of 9px. Otherwise a row or a
 * column lands between pixels and the lines look uneven at this small size.
 */
const GRID_CLASSES =
  "grid aspect-square w-[calc(round(down,100%-4*var(--stroke-thin)-6*var(--stroke-hair),9px)+4*var(--stroke-thin)+6*var(--stroke-hair))] grid-cols-3 grid-rows-3 gap-(--stroke-thin) overflow-clip rounded-art-cell border-thin border-ink bg-ink";

/**
 * A small copy of the big board, drawn like it: one grid in an ink outline, thin lines between cells and thicker ones
 * between small boards (the ink showing through the gaps, so each kind is one width everywhere). Won squares are filled
 * with a lighter version of the winner's color under their big mark; the others hold their small marks.
 */
export function UltimateArt() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden="true">
      <div className={GRID_CLASSES}>
        {PREVIEW.map((square, index) => {
          const won = "won" in square ? square.won : null;
          const marks = "marks" in square ? square.marks : EMPTY;
          return (
            <span key={index} className="relative grid min-h-0 grid-cols-3 grid-rows-3 gap-(--stroke-hair)" style={won !== null ? playerStyle(won) : undefined}>
              {marks.map((mark, place) => (
                <span
                  key={place}
                  className={clsx("flex min-h-0 items-center justify-center", won !== null ? "bg-player-light" : "bg-white")}
                  style={mark !== null ? playerStyle(mark) : undefined}
                >
                  {mark !== null && <Mark seat={mark} className="size-full" />}
                </span>
              ))}
              {won !== null && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Mark seat={won} fit="full" className="size-full" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
