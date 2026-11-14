import { clsx } from "clsx";

/** The logo's pawn, in its own units: a ball for a head, a flared body, a rounded base. Its outline is drawn round it. */
const HEAD = { cy: -72, r: 40 } as const;
const BODY = "M-26 -40C-26 -10 -58 26 -62 64H62C58 26 26 -10 26 -40Z";
const BASE = { x: -80, y: 60, width: 160, height: 40, rx: 16 } as const;
/** The one shine, on its head where the light hits it. */
const SHINE = { cx: -14, cy: -86, rx: 10, ry: 14 } as const;
/** Room for its outline around the shape. */
const VIEW = { x: -90, y: -122, width: 180, height: 232 } as const;
/** How tall a pawn is for its width (a board sizes it by its width). */
export const PAWN_ASPECT = VIEW.height / VIEW.width;
/** In its own units: the ink outline, and your own pawn's mark: a white dot on its body. */
const OUTLINE = 14;
const MARK = { cy: 22, r: 17 } as const;

function Shape({ className, strokeWidth }: { className: string; strokeWidth: number }) {
  return (
    <g className={className} strokeWidth={strokeWidth} strokeLinejoin="round">
      <path d={BODY} />
      <circle cy={HEAD.cy} r={HEAD.r} />
      <rect {...BASE} />
    </g>
  );
}

interface PawnProps {
  /** Your own: a white dot on its body, so you find yourself at a glance. */
  mine?: boolean;
  className?: string;
}

/**
 * A player's piece in the board games (Snakes & Ladders, Ludo): the pawn from the logo, in their color (`playerStyle` on a parent), outlined in ink with one white
 * shine on its head. Flat, with no shadow under it (owner direction 2026-11-14).
 */
export function Pawn({ mine = false, className }: PawnProps) {
  return (
    <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`} className={clsx("overflow-visible", className)} aria-hidden="true">
      <Shape className="fill-player stroke-ink" strokeWidth={OUTLINE} />
      <ellipse {...SHINE} className="fill-white opacity-secondary" />
      {mine && <circle {...MARK} className="fill-white stroke-ink" strokeWidth={OUTLINE * 0.7} />}
    </svg>
  );
}
