import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Cell, Seat } from "../../../shared/games/fourinarow/types";
import { playerStyle } from "../../utils/playerStyle";
import { Disc } from "./Disc";
import { fallMs } from "./drop";

interface FourInARowCellProps {
  value: Cell;
  /** Player id whose color paints this disc. */
  colorIndex: number | null;
  row: number;
  label: string;
  /** You are aiming at this hole's column: an empty hole lights up (in a pale indigo, never a player's color, so it can't be taken for a disc). */
  aimed: boolean;
  /** Whose phone it is: your own discs carry the ring. */
  viewer: Seat | null;
  /** Your disc's ghost while you aim at this column: its seat and color. */
  ghost: { seat: Seat; colorIndex: number } | null;
  winning: boolean;
  /** The disc that just landed: it falls in from the row above the board. */
  fresh: boolean;
  /** The winner is looking: the winning discs jump one after another. */
  celebrate: boolean;
  /** After a win: holes off the winning line fade back so it stands out. */
  faded: boolean;
  /** This disc's place along the winning line, so the jumps run in order. */
  hopOrder: number;
}

/**
 * One hole of the board: a pale round well with an ink outline, lit in pale indigo while you aim at its column. Its disc
 * fills it, falling in from above and bouncing when it's the one just played; on the winning line it gets a white band,
 * and on the winner's phone the winning holes then jump one after another, discs and all.
 */
export function FourInARowCell({ value, colorIndex, row, label, aimed, viewer, ghost, winning, fresh, celebrate, faded, hopOrder }: FourInARowCellProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={clsx(
        "relative aspect-square rounded-pill border-thin border-ink transition-colors duration-fast ease-out",
        value === null && aimed ? "bg-aim-column" : winning ? "bg-white" : "bg-background",
        faded && "animate-fade-back",
        // The whole hole jumps, so its glow falls round the white rim (on the board in the winner's color), not on it.
        winning && celebrate && "origin-[50%_90%] animate-mark-hop",
      )}
      style={{ ...(colorIndex !== null ? playerStyle(colorIndex) : {}), "--hop-order": hopOrder } as CSSProperties}
    >
      {/* Over the hole's own outline (out by its width), the same size and border, so the two outlines are one. */}
      {value !== null && (
        <span
          className={clsx("absolute -inset-(--stroke-thin) origin-bottom", fresh && "animate-disc-drop")}
          style={fresh ? ({ "--drop-rows": row + 1, "--fall-ms": `${fallMs(row)}ms` } as CSSProperties) : undefined}
        >
          <Disc seat={value} viewer={viewer} lit={winning} className="size-full" />
        </span>
      )}
      {value === null && ghost && (
        <span className="absolute -inset-(--stroke-thin)" style={playerStyle(ghost.colorIndex)}>
          <Disc seat={ghost.seat} viewer={viewer} className="size-full opacity-disc-ghost" />
        </span>
      )}
    </span>
  );
}
