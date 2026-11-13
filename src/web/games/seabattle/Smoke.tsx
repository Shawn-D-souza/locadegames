import { clsx } from "clsx";
import type { CSSProperties } from "react";

/** Three puffs, a third of a drift apart, so the wisp never thins out. */
const PUFFS = [0, 1, 2].map((i) => ({ "--smoke-delay": `calc(var(--duration-smoke) * ${-i} / 3)` }) as CSSProperties);

interface SmokeProps {
  /** Off a sunk ship: a fuller wisp than off a single hit. */
  big: boolean;
  /** Which cell it rises from: each wisp drifts out of step with the others. */
  seed: number;
}

/**
 * Smoke rising off a hit or a wreck: soft puffs (no edge) drifting up and a little downwind, swelling and fading as
 * they go, one after another. Quiet: it only looks good, and it stands still for anyone who asks for less motion.
 */
export function Smoke({ big, seed }: SmokeProps) {
  const phase = { "--smoke-phase": `calc(var(--duration-smoke) * ${-((seed * 7) % 10)} / 30)` } as CSSProperties;
  return (
    <span className={clsx("pointer-events-none absolute", big ? "inset-[10%]" : "inset-1/4")} style={phase} aria-hidden="true">
      {PUFFS.map((style, i) => (
        <span key={i} className="absolute inset-0 animate-smoke rounded-pill sea-smoke motion-reduce:hidden" style={style} />
      ))}
    </span>
  );
}
