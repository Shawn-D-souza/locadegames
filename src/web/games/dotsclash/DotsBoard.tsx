import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { DOTSCLASH_CONFIG } from "../../../shared/games/dotsclash/config";
import { neighbours } from "../../../shared/games/dotsclash/board";
import { DotsCell, type IncomingDot } from "./DotsCell";
import { wrapsOff } from "./flights";
import type { BoardMoment } from "./useChainPlayback";

/** Boards this many cells across or more get the narrower gap between tiles, so their cells stay big enough to tap. */
const NARROW_GAP_FROM = 8;
const NO_INCOMING: readonly IncomingDot[] = [];

interface DotsBoardProps {
  size: number;
  moment: BoardMoment;
  /** Each cell's colors (`playerStyle` of its owner, grey for a quitter), or undefined while empty. */
  paintOf(cell: number): CSSProperties | undefined;
  /** A cell's name for screen readers. */
  labelOf(cell: number): string;
  canTap(cell: number): boolean;
  youPaint: CSSProperties;
  /** The game just ended: the board thumps. */
  ended: boolean;
  onTap(cell: number): void;
}

/**
 * The board: rounded white tiles with a gap between them, straight on the screen's wash. It wraps on all four sides, so
 * dots flying off one edge come in on the other (the board clips them as they leave).
 */
export function DotsBoard({ size, moment, paintOf, labelOf, canTap, youPaint, ended, onTap }: DotsBoardProps) {
  const bursting = new Set(moment.bursting);
  // Dots flying off one edge come in on the other: the tiles they land on show them arriving.
  const incoming = new Map<number, IncomingDot[]>();
  for (const from of moment.bursting) {
    neighbours(size, from).forEach((to, dir) => {
      if (wrapsOff(size, from, dir)) incoming.set(to, [...(incoming.get(to) ?? []), { dir, paint: paintOf(from) }]);
    });
  }
  return (
    <div
      className={clsx("grid w-full gap-(--board-gap) overflow-clip pb-lip-small", ended && "animate-board-thump")}
      style={
        {
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          "--board-gap": size >= NARROW_GAP_FROM ? "var(--space-1)" : "var(--space-2)",
          "--fly-ms": `${DOTSCLASH_CONFIG.flyMs}ms`,
        } as CSSProperties
      }
      role="group"
      aria-label="Board"
    >
      {moment.dots.map((dots, cell) => (
        <DotsCell
          key={cell}
          paint={paintOf(cell)}
          dots={dots}
          bursting={bursting.has(cell)}
          incoming={incoming.get(cell) ?? NO_INCOMING}
          playable={canTap(cell)}
          youPaint={youPaint}
          label={labelOf(cell)}
          onTap={() => onTap(cell)}
        />
      ))}
    </div>
  );
}
