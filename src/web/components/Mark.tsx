import type { Seat } from "../../shared/games/tictactoe/types";

/** Glyph geometry in a 100-unit viewBox: seat 0 is X, seat 1 is O, so shape backs up color. Ink outline like everything else. */
const GLYPH = { stroke: 16, outline: 26, xInset: 24, oRadius: 28, center: 50 } as const;

function Shape({ seat, width, color }: { seat: Seat; width: number; color: string }) {
  const { xInset, oRadius, center } = GLYPH;
  const far = 100 - xInset;
  return seat === 0 ? (
    <path d={`M${xInset} ${xInset}L${far} ${far}M${far} ${xInset}L${xInset} ${far}`} stroke={color} strokeWidth={width} strokeLinecap="round" />
  ) : (
    <circle cx={center} cy={center} r={oRadius} stroke={color} strokeWidth={width} fill="none" />
  );
}

export function Mark({ seat, className }: { seat: Seat; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <Shape seat={seat} width={GLYPH.outline} color="var(--color-ink)" />
      <Shape seat={seat} width={GLYPH.stroke} color="var(--player)" />
    </svg>
  );
}
