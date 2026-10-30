import { TICTACTOE_CONFIG } from "../../shared/games/tictactoe/config";

/** Geometry in a viewBox of 100 units per cell; the line runs past the outer cell centers by `overshoot`. */
const LINE = { cell: 100, overshoot: 30, stroke: 14, outline: 24 } as const;

/** Hidden by its own dash until the draw animation pulls the dash back. */
const STROKE = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1, fill: "none", strokeLinecap: "round" } as const;

/** The line drawn through a winning row, over the board's cells (inside its padding), in the winner's color (`--player`). */
export function WinLine({ cells }: { cells: readonly number[] }) {
  const { boardSize } = TICTACTOE_CONFIG;
  const size = boardSize * LINE.cell;
  const center = (index: number) => ({
    x: (index % boardSize) * LINE.cell + LINE.cell / 2,
    y: Math.floor(index / boardSize) * LINE.cell + LINE.cell / 2,
  });
  const a = center(cells[0]!);
  const b = center(cells[cells.length - 1]!);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = ((b.x - a.x) / length) * LINE.overshoot;
  const dy = ((b.y - a.y) / length) * LINE.overshoot;
  const d = `M${a.x - dx} ${a.y - dy}L${b.x + dx} ${b.y + dy}`;
  return (
    <div className="pointer-events-none absolute inset-4">
      <svg className="size-full overflow-visible" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={d} {...STROKE} className="animate-win-line" stroke="var(--color-ink)" strokeWidth={LINE.outline} />
        <path d={d} {...STROKE} className="animate-win-line" stroke="var(--player)" strokeWidth={LINE.stroke} />
      </svg>
    </div>
  );
}
