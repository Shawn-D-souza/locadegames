import { useLayoutEffect, useRef, type ReactNode } from "react";
import { durations } from "../../../theme";
import type { Point } from "./view";

const translateOf = (point: Point) => `${point.x * 100}% ${point.y * 100}%`;

interface MovingPieceProps {
  /** Where it starts; left out, it just sits at `to` (a piece being dragged). */
  from?: Point;
  to: Point;
  children: ReactNode;
}

/**
 * A piece that is moving, over the board's squares: one square's size, sliding straight from where it was to its new
 * square (a knight too: it's quicker to read than a hop). Remount it (a new `key`) for each new move.
 */
export function MovingPiece({ from, to, children }: MovingPieceProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const path = from ? `${translateOf(from)}>${translateOf(to)}` : "";
  useLayoutEffect(() => {
    if (!from || !ref.current?.animate) return;
    ref.current.animate([{ translate: translateOf(from) }, { translate: translateOf(to) }], { duration: durations.chessSlide, easing: "ease-out" });
    // The slide is read from its two points, which `path` stands for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return (
    <span ref={ref} className="pointer-events-none absolute top-0 left-0 size-1/8" style={{ translate: translateOf(to) }} aria-hidden="true">
      {children}
    </span>
  );
}
