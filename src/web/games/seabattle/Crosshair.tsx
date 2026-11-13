import { clsx } from "clsx";
import { colOf, rowOf } from "../../../shared/games/seabattle/fleet";
import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { cellBox } from "./seaGeometry";

const SIZE = SEABATTLE_CONFIG.boardSize;

/**
 * Where you're aiming while you hold your finger down: thin lines along the cell's row and column in your color, and a
 * ring on the cell (ink and your color; faded on a cell already shot, where letting go does nothing).
 */
export function Crosshair({ cell, open }: { cell: number; open: boolean }) {
  return (
    <>
      <span className="absolute flex items-center" style={cellBox(rowOf(cell) * SIZE, SIZE, 1)}>
        <span className="h-(--stroke-thin) w-full bg-player opacity-target-waiting" />
      </span>
      <span className="absolute flex justify-center" style={cellBox(colOf(cell), 1, SIZE)}>
        <span className="h-full w-(--stroke-thin) bg-player opacity-target-waiting" />
      </span>
      <span className="absolute flex items-center justify-center" style={cellBox(cell)}>
        <span
          className={clsx(
            "flex size-full animate-pop-in items-center justify-center rounded-pill border-outline border-ink bg-player-light",
            !open && "opacity-disabled",
          )}
        >
          <span className="size-1/4 rounded-pill border-thin border-ink bg-player" />
        </span>
      </span>
    </>
  );
}
