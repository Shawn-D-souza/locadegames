import type { Seat } from "../../shared/games/tictactoe/types";

/**
 * Glyph geometry in a 100-unit viewBox: seat 0 is X, seat 1 is O, so shape backs up color. Ink outline like everything
 * else. `cell` leaves room round the mark (a cell, a card's disc); `full` fills its box (a won small board's big mark).
 */
const GLYPHS = {
  cell: { stroke: 16, outline: 26, xInset: 24, oRadius: 28, center: 50 },
  full: { stroke: 16, outline: 26, xInset: 19, oRadius: 31, center: 50 },
} as const;

type Fit = keyof typeof GLYPHS;

function Shape({ seat, fit, width, color }: { seat: Seat; fit: Fit; width: number; color: string }) {
  const { xInset, oRadius, center } = GLYPHS[fit];
  const far = 100 - xInset;
  return seat === 0 ? (
    <path d={`M${xInset} ${xInset}L${far} ${far}M${far} ${xInset}L${xInset} ${far}`} stroke={color} strokeWidth={width} strokeLinecap="round" />
  ) : (
    <circle cx={center} cy={center} r={oRadius} stroke={color} strokeWidth={width} fill="none" />
  );
}

export function Mark({ seat, fit = "cell", className }: { seat: Seat; fit?: Fit; className?: string }) {
  const glyph = GLYPHS[fit];
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <Shape seat={seat} fit={fit} width={glyph.outline} color="var(--color-ink)" />
      <Shape seat={seat} fit={fit} width={glyph.stroke} color="var(--player)" />
    </svg>
  );
}
