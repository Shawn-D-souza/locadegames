import { useId, type CSSProperties } from "react";

/** A cannonball: round iron, lit from the top left, in an ink outline (the ball in flight, and the tile's). */
export function IronBall({ className, style }: { className?: string; style?: CSSProperties }) {
  const metal = `${useId()}-ball`;
  return (
    <svg viewBox="0 0 20 20" className={className} style={style}>
      <defs>
        <radialGradient id={metal} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" style={{ stopColor: "var(--color-char-part)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--color-char-deck)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-char)" }} />
        </radialGradient>
      </defs>
      <circle cx={10} cy={10} r={9} fill={`url(#${metal})`} className="stroke-ink [vector-effect:non-scaling-stroke]" style={{ strokeWidth: "var(--stroke-thin)" }} />
      <circle cx={7} cy={6.5} r={2} className="fill-white opacity-rays" />
    </svg>
  );
}
