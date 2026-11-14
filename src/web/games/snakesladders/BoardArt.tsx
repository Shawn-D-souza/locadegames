import { memo, useId } from "react";
import { LADDERS, SNAKES } from "../../../shared/games/snakesladders/board";
import { strokes } from "../../../theme";
import { ladderParts, snakeBodyPath, snakeHead, snakeSpine, squareCenter, type Point } from "./geometry";
import { snakeSkin, type SkinTone } from "./snakeSkin";

/** Ladders' rails and rungs, in board units: the ink under them (their outline), the white on top, and the lip below. */
const RAIL = { ink: 1.7, white: 0.95, lip: 0.55 } as const;
/**
 * A snake's eyes, as shares of its head's size (from the middle of the head: forward, to each side; their size, the
 * pupil's, how far it looks ahead, the glint in it), and its tongue (board units).
 */
const EYE = { forward: 0.4, side: 0.5, radius: 0.3, pupil: 0.17, look: 0.08, glint: 0.07, glintRadius: 0.06 } as const;
const TONGUE = { length: 1.4, fork: 0.42, width: 0.3 } as const;

const line = ([a, b]: readonly [Point, Point]) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });

/** One ladder from `foot` to `top` (board units): white rails and rungs outlined in ink, with a solid ink lip under them (DESIGN.md: one drop, no blur). */
export function Ladder({ foot, top }: { foot: Point; top: Point }) {
  const { rails, rungs } = ladderParts(foot, top);
  const parts = [...rails, ...rungs];
  return (
    <g strokeLinecap="round">
      {parts.map((part, i) => (
        <line key={`lip${i}`} {...line(part)} className="stroke-ink" strokeWidth={RAIL.ink} transform={`translate(0 ${RAIL.lip})`} />
      ))}
      {parts.map((part, i) => (
        <line key={`ink${i}`} {...line(part)} className="stroke-ink" strokeWidth={RAIL.ink} />
      ))}
      {parts.map((part, i) => (
        <line key={`white${i}`} {...line(part)} className="stroke-white" strokeWidth={RAIL.white} />
      ))}
    </g>
  );
}

const FILLS: Record<SkinTone, string> = { dark: "fill-ink", belly: "fill-snake-belly" };

/** The head's outline in its own units (a share of its size, facing +x): wide at the jaw, narrowing to a round snout. */
const HEAD_PATH =
  "M-0.85 0C-0.85 -0.68 -0.35 -0.95 0.15 -0.88C0.7 -0.8 1.15 -0.48 1.15 0C1.15 0.48 0.7 0.8 0.15 0.88C-0.35 0.95 -0.85 0.68 -0.85 0Z";

/**
 * One snake (DESIGN.md, Illustration: thick outline, one shine): a slim indigo body, speckled with a pale belly
 * (`snakeSkin.ts`), a slim neck and a long taper to a fine tail; a head wider than its neck, narrowing to a round
 * snout, with two shiny eyes and a coral tongue, and nothing else on it (owner direction 2026-11-14: a lavender
 * patch on top was taken off).
 */
export function Snake({ spine }: { spine: readonly Point[] }) {
  const face = snakeHead(spine);
  const r = face.radius;
  const body = snakeBodyPath(spine);
  const clip = useId();
  return (
    <g>
      <clipPath id={clip}>
        <path d={body} />
      </clipPath>
      <path d={body} className="fill-snake" />
      <g clipPath={`url(#${clip})`}>
        {snakeSkin(spine).map((mark, i) => (
          <path key={i} d={mark.d} className={FILLS[mark.tone]} />
        ))}
      </g>
      {/* The outline last, so the skin ends neatly at the body's edge. */}
      <path d={body} className="fill-none stroke-ink" strokeWidth={strokes.thin} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <g transform={`translate(${face.at.x} ${face.at.y}) rotate(${face.angle})`}>
        <path
          d={`M${r * 1.1} 0 h${TONGUE.length} m0 0 l${TONGUE.fork} ${-TONGUE.fork} m${-TONGUE.fork} ${TONGUE.fork} l${TONGUE.fork} ${TONGUE.fork}`}
          className="fill-none stroke-coral"
          strokeWidth={TONGUE.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={HEAD_PATH} transform={`scale(${r})`} className="fill-snake stroke-ink" strokeWidth={strokes.thin} vectorEffect="non-scaling-stroke" />
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${r * EYE.forward} ${side * r * EYE.side})`}>
            <circle r={r * EYE.radius} className="fill-white stroke-ink" strokeWidth={strokes.hair} vectorEffect="non-scaling-stroke" />
            <circle cx={r * EYE.look} r={r * EYE.pupil} className="fill-ink" />
            <circle cx={r * (EYE.look - EYE.glint)} cy={-r * EYE.glint} r={r * EYE.glintRadius} className="fill-white" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** Every ladder, then every snake on top, drawn once over the squares (the board's layout never changes). */
export const BoardArt = memo(function BoardArt() {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      {Object.entries(LADDERS).map(([foot, top]) => (
        <Ladder key={foot} foot={squareCenter(Number(foot))} top={squareCenter(top)} />
      ))}
      {Object.entries(SNAKES).map(([head, tail]) => (
        <Snake key={head} spine={snakeSpine(Number(head), tail)} />
      ))}
    </svg>
  );
});
