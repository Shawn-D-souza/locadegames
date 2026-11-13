import type { CSSProperties } from "react";
import { IronBall } from "./IronBall";
import { STAGE, type Point } from "./stageGeometry";

interface CannonBallProps {
  from: Point;
  to: Point;
  /** How long it waits in the muzzle (the other's cannon swings round first). */
  delayMs: number;
}

const at = (p: Point) => ({
  x: `calc(var(--sea-l) * ${p.x} - 50%)`,
  y: `calc(var(--sea-l) * ${p.y} - 50%)`,
});

/**
 * A cannonball in flight: its shadow slides straight over the water to the cell while the ball rises above it on
 * screen, growing to the top of its arc, then drops onto it (thrown up fast, slowing, falling faster).
 */
export function CannonBall({ from, to, delayMs }: CannonBallProps) {
  const start = at(from);
  const end = at(to);
  const size = `calc(var(--sea-l) * ${STAGE.ball})`;
  const style = {
    width: size,
    height: size,
    "--from-x": start.x,
    "--from-y": start.y,
    "--to-x": end.x,
    "--to-y": end.y,
    "--shot-delay": `${delayMs}ms`,
  } as CSSProperties;
  return (
    <>
      <span
        className="pointer-events-none absolute top-0 left-0 z-raised animate-shot-shadow rounded-pill bg-ink"
        style={style}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 left-0 z-raised animate-shot-fly"
        style={style}
        aria-hidden="true"
      >
        <IronBall className="size-full animate-shot-arc overflow-visible" />
      </div>
    </>
  );
}
