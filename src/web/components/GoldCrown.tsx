import { clsx } from "clsx";

interface GoldCrownProps {
  /** Its size (width; the height follows) and where it sits. */
  className?: string;
}

/** The crown's shape, in its own units: three points with a ball on each, on a band. */
const BODY = "M6 33 L4 13 L15 22 L24 8 L33 22 L44 13 L42 33 Q42 36 39 36 L9 36 Q6 36 6 33 Z";
const BAND = { x: 6, y: 28, width: 36, height: 8, corner: 3 };
const SHINE = "M10 26 L9 19 L14.5 23.5 Z";
const BALLS = [
  [4, 13],
  [24, 8],
  [44, 13],
] as const;
const BALL_RADIUS = 4;
const JEWEL_RADIUS = 2.2;
const OUTLINE = 2.5;
const VIEW = "-1.5 2.5 51 35.5";

/**
 * A chunky gold crown in the theme's gold, outlined in ink like the rest of the UI: its band, three points
 * with a ball on each, a jewel and a glint where the light hits. Champions wear it on the results.
 */
export function GoldCrown({ className }: GoldCrownProps) {
  return (
    <svg viewBox={VIEW} className={clsx("flex-none stroke-ink", className)} strokeWidth={OUTLINE} strokeLinejoin="round" aria-hidden="true">
      <path d={BODY} className="fill-gold" />
      <path d={SHINE} className="fill-gold-light stroke-0" />
      <rect x={BAND.x} y={BAND.y} width={BAND.width} height={BAND.height} rx={BAND.corner} className="fill-gold" />
      <circle cx={24} cy={BAND.y + BAND.height / 2} r={JEWEL_RADIUS} className="fill-gold-light stroke-0" />
      {BALLS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={BALL_RADIUS} className="fill-gold-light" />
      ))}
    </svg>
  );
}
