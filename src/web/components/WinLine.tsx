import { clsx } from "clsx";

/** Geometry in a viewBox of 100 units per square; the line runs past the outer square centers by `overshoot`. */
const LINE = { cell: 100, overshoot: 30, stroke: 14, outline: 24 } as const;

/** Hidden by its own dash (offset 1) until the draw animation pulls the dash back; offset 0 shows it drawn. */
const STROKE = { pathLength: 1, strokeDasharray: 1, fill: "none", strokeLinecap: "round" } as const;

interface WinLineProps {
  /** The winning squares, in a board `size` squares wide. */
  cells: readonly number[];
  size: number;
  /** Where the squares are: the board's padding as an inset. */
  className: string;
  /** Draws itself through (from `--line-at`); false: already there (a small board won before you looked). */
  animate?: boolean;
}

/** The line drawn through a winning row, over the board's squares (inside its padding), in the winner's color (`--player`). */
export function WinLine({ cells, size, className, animate = true }: WinLineProps) {
  const extent = size * LINE.cell;
  const center = (index: number) => ({
    x: (index % size) * LINE.cell + LINE.cell / 2,
    y: Math.floor(index / size) * LINE.cell + LINE.cell / 2,
  });
  const a = center(cells[0]!);
  const b = center(cells[cells.length - 1]!);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = ((b.x - a.x) / length) * LINE.overshoot;
  const dy = ((b.y - a.y) / length) * LINE.overshoot;
  const d = `M${a.x - dx} ${a.y - dy}L${b.x + dx} ${b.y + dy}`;
  return (
    <div className={clsx("pointer-events-none absolute", className)}>
      <svg className="size-full overflow-visible" viewBox={`0 0 ${extent} ${extent}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={d} {...STROKE} strokeDashoffset={animate ? 1 : 0} className={animate ? "animate-win-line" : undefined} stroke="var(--color-ink)" strokeWidth={LINE.outline} />
        <path d={d} {...STROKE} strokeDashoffset={animate ? 1 : 0} className={animate ? "animate-win-line" : undefined} stroke="var(--player)" strokeWidth={LINE.stroke} />
      </svg>
    </div>
  );
}
