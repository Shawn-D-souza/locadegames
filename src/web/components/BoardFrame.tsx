import { clsx } from "clsx";
import type { ReactNode, Ref } from "react";
import { playerStyle } from "../utils/playerStyle";
import { ResultTag, type ResultTone } from "./ResultTag";
import { WinLine } from "./WinLine";

/** How the match ended for whoever is looking, shown on the board itself. */
export interface BoardEnding {
  tone: ResultTone;
  label: string;
  points: number | null;
  detail: string | null;
  /** The winner's player id (null for a draw); paints the board. */
  winnerId: number | null;
}

/**
 * Room around the squares: tic-tac-toe's big cells sit apart in a roomy card; a board of small boards is one continuous
 * grid, its squares touching the outline and each other (they draw their own lines). The win line sits inside the same padding.
 *
 * The continuous grid snaps its width down so all 9 cells across are whole pixels: its lines (the frame's 2, two per
 * small board: 8 line widths in all) plus a multiple of 9px. Otherwise a column starts between pixels and its lines blur.
 */
const SPACING_CLASSES = {
  roomy: { frame: "w-full gap-3 rounded-card p-4", line: "inset-4" },
  flush: {
    frame: "mx-auto w-[calc(round(down,100%-8*var(--stroke-thin),9px)+8*var(--stroke-thin))] rounded-small-board",
    line: "inset-0",
  },
} as const;

interface BoardFrameProps {
  /** Squares per side; the frame's first children are its squares, in order (the win line and the sparks find them by position). */
  size: number;
  spacing: keyof typeof SPACING_CLASSES;
  /** The squares that won, or null. */
  winningLine: readonly number[] | null;
  isDraw: boolean;
  /** Set once the match is over: a win fills the board with the winner's color and the result tag sits on its edge. */
  ending: BoardEnding | null;
  countUp: boolean;
  /** When the result tag lands, in ms after the match ended (for the count-up). */
  tagLandsAtMs: number;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/**
 * A turn-based game's board: a white outlined card holding its squares. A finished match is shown on it, so nothing on
 * the screen moves: the last move lands with a thump and a short freeze, then a win draws its line and the board fills
 * with the winner's color; a draw shakes. The result tag sits on its bottom edge.
 */
export function BoardFrame({ size, spacing, winningLine, isDraw, ending, countUp, tagLandsAtMs, ref, children }: BoardFrameProps) {
  const winnerId = ending?.winnerId ?? null;
  return (
    <div
      ref={ref}
      className={clsx(
        "relative grid border-thin border-ink bg-white",
        SPACING_CLASSES[spacing].frame,
        winnerId !== null ? "animate-board-win" : isDraw && "animate-board-draw",
      )}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, ...(winnerId !== null ? playerStyle(winnerId) : {}) }}
      role="group"
      aria-label="Board"
    >
      {children}
      {winningLine && <WinLine cells={winningLine} size={size} className={SPACING_CLASSES[spacing].line} />}
      {ending && (
        <ResultTag
          tone={ending.tone}
          label={ending.label}
          points={ending.points}
          detail={ending.detail}
          countUp={countUp}
          landsAtMs={tagLandsAtMs}
        />
      )}
    </div>
  );
}
