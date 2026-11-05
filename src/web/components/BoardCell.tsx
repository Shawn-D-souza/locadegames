import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Cell } from "../../shared/games/tictactoe/types";
import { playerStyle } from "../utils/playerStyle";
import { Mark } from "./Mark";

interface BoardCellProps {
  index: number;
  value: Cell;
  /** Player id whose color paints this mark. */
  colorIndex: number | null;
  label: string;
  playable: boolean;
  winning: boolean;
  fresh: boolean;
  /** Winner's own phone: winning marks grow and glow. */
  celebrate: boolean;
  /** After a win: cells off the winning line fade back so the line stands out. */
  faded: boolean;
  /** How the winning marks celebrate on the winner's phone: grow and glow, or jump one after another. */
  motion?: "glow" | "hop";
  /** This mark's place along the winning line (0, 1, 2), so the jumps run in order. */
  hopOrder?: number;
  onPlay(index: number): void;
}

/** A new mark pops in. On the winner's phone the winning marks then jump one after another, or grow and glow. */
const MARK_CLASSES = {
  hop: "origin-[50%_90%] animate-mark-hop",
  glow: "animate-mark-glow",
  popGlow: "animate-mark-pop-glow",
  pop: "animate-pop-in",
} as const;

function markAnimation({ winning, celebrate, fresh, motion }: Pick<BoardCellProps, "winning" | "celebrate" | "fresh" | "motion">) {
  if (winning && celebrate) return MARK_CLASSES[motion === "hop" ? "hop" : fresh ? "popGlow" : "glow"];
  return fresh ? MARK_CLASSES.pop : undefined;
}

/**
 * Empty cells are flat wells; on your turn they rise with a lip because you can tap them. After a win the winning
 * cells turn white, so they stand out on the board in the winner's color, and the others fade back.
 */
export function BoardCell({ index, value, colorIndex, label, playable, winning, fresh, celebrate, faded, motion = "glow", hopOrder = 0, onPlay }: BoardCellProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex aspect-square items-center justify-center rounded-tile border-thin border-ink p-2",
        "transition-[translate,box-shadow,background-color] duration-fast ease-spring",
        playable
          ? "cursor-pointer bg-white shadow-lip-small active:translate-y-lip-small active:shadow-pressed"
          : winning
            ? "bg-white"
            : "bg-background",
        faded && "animate-fade-back",
      )}
      style={{ ...(colorIndex !== null ? playerStyle(colorIndex) : {}), "--hop-order": hopOrder } as CSSProperties}
      disabled={!playable}
      aria-label={label}
      onClick={() => {
        onPlay(index);
      }}
    >
      {value !== null && <Mark seat={value} className={clsx("size-full", markAnimation({ winning, celebrate, fresh, motion }))} />}
    </button>
  );
}
