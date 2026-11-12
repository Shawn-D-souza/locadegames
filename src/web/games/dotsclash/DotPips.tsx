import { clsx } from "clsx";

/**
 * Where the dots sit on a tile (centers, as a share of its width and height): 1 in the middle, 2 side by side, 3 as a
 * triangle (owner direction), 4 as a plus (only for the moment before a tile bursts): each on the side it's about to
 * fly out of, so every dot flies dead straight (owner direction: no twist). Kept clear of the tile's corners.
 */
const SPOTS: Record<number, readonly (readonly [x: number, y: number])[]> = {
  1: [[50, 50]],
  2: [[32, 50], [68, 50]],
  3: [[50, 32], [32, 66], [68, 66]],
  4: [[50, 24], [76, 50], [50, 76], [24, 50]],
};

interface DotPipsProps {
  /** 1–4 (more shows as 4: only while a chain is still running). */
  count: number;
  className?: string;
  /** A dot in flight: outlined in its owner's color, so it shows over white tiles and the gaps. */
  flying?: boolean;
}

/** A tile's dots, straight on its owner's color (set by `playerStyle` on a parent): white, or ink on a light color, like dice. */
export function DotPips({ count, className, flying = false }: DotPipsProps) {
  const spots = SPOTS[Math.min(count, 4)] ?? [];
  return (
    <span className={clsx("pointer-events-none absolute inset-0", className)} aria-hidden="true">
      {spots.map(([x, y]) => (
        <span
          key={`${x}${y}`}
          className={clsx("absolute size-[28%] -translate-1/2 rounded-pill bg-player-text", flying && "border-thin border-player")}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </span>
  );
}
