import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { ImpactKind } from "./seaBattleCues";
import { cellBox } from "./seaGeometry";

/** Where the bits fly, as a share of their own size: a splash's drops, a blast's embers. */
const spray = (count: number, reach: number, turn: number): CSSProperties[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = ((i / count) * 360 + turn) * (Math.PI / 180);
    return { "--dx": `${Math.round(Math.cos(angle) * reach)}%`, "--dy": `${Math.round(Math.sin(angle) * reach)}%` } as CSSProperties;
  });
const DROPS = spray(6, 300, 30);
const EMBERS = spray(7, 420, 10);

/**
 * A cannonball landing, over its cell, played once: a miss splashes (a ring of water spreading, drops thrown up), a
 * hit blasts (a white-hot flash through gold, embers, a puff of smoke), a sinking blasts bigger.
 */
export function ShotImpact({ cell, kind }: { cell: number; kind: ImpactKind }) {
  return (
    <span className="pointer-events-none absolute flex items-center justify-center" style={cellBox(cell)} aria-hidden="true">
      {kind === "miss" ? (
        <>
          <span className="absolute size-full animate-impact-ring rounded-pill border-outline border-white" />
          {DROPS.map((style, i) => (
            <span key={i} className="absolute size-[14%] animate-spray rounded-pill bg-white" style={style} />
          ))}
        </>
      ) : (
        <>
          <span className="absolute inset-[15%] animate-impact-puff rounded-pill sea-smoke" />
          <span className={clsx("absolute animate-impact-ring rounded-pill sea-flash", kind === "sunk" ? "size-[160%]" : "size-[110%]")} />
          {EMBERS.map((style, i) => (
            <span key={i} className="absolute size-[10%] animate-spray rounded-pill bg-gold-light" style={style} />
          ))}
        </>
      )}
    </span>
  );
}
