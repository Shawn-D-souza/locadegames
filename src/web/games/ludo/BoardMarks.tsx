import { armSquares, isSafe } from "../../../shared/games/ludo/board";
import { strokes } from "../../../theme";
import { paintOf, type ArmOwner } from "./BoardArt";
import { pathOf, type LudoLayout, type Point } from "./geometry";

/** The safe squares' star: its points' reach and inner reach, as shares of a square. */
const STAR = { outer: 0.36, inner: 0.15, points: 5 } as const;
/** The white pad under pawns home (so they show on their own color), as a share of the room in the home triangle. */
const HOME_PAD = 0.86;
/** How near a pawn must stand to hide a mark, as a share of a square: a star under any pawn on its square (even huddled), a socket only under the pawn in it. */
const HIDES = { star: 0.45, socket: 0.25 } as const;
/** How near a pawn must stand to a home triangle's middle to be home (they huddle round it), as a share of its room. */
const HOME_NEAR = 0.7;

function star(center: Point, cell: number): string {
  const points = Array.from({ length: STAR.points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / STAR.points;
    const reach = (i % 2 === 0 ? STAR.outer : STAR.inner) * cell;
    return { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach };
  });
  return pathOf(points);
}

interface BoardMarksProps {
  layout: LudoLayout;
  owners: readonly (ArmOwner | null)[];
  /** Where every pawn stands now. */
  pawnsAt: readonly Point[];
}

/**
 * What a pawn standing on it covers, as a counter on a real board does: a star on every safe square (gold on white,
 * white on a start square), and in each base a socket in the arm's tint for each pawn, showing only while its pawn is
 * out. And what shows only under pawns: a white pad in a home triangle once a pawn is home, so it stands out on its
 * own color.
 */
export function BoardMarks({ layout, owners, pawnsAt }: BoardMarksProps) {
  const { cell, board } = layout;
  const covered = (at: Point, within: number) => pawnsAt.some((p) => Math.hypot(p.x - at.x, p.y - at.y) < within * cell);
  const hair = { vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const, strokeWidth: strokes.hair };
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
      {layout.cells.map((c, i) => {
        if (c.square === null || !isSafe(board, c.square) || covered(c.center, HIDES.star)) return null;
        const start = c.square % armSquares(board) === board.armLength + 2;
        return <path key={i} d={star(c.center, cell)} className={start ? "fill-white stroke-ink" : "fill-ludo-star stroke-ink"} {...hair} />;
      })}
      {layout.homes.map((home, arm) =>
        pawnsAt.some((p) => Math.hypot(p.x - home.center.x, p.y - home.center.y) < home.room * HOME_NEAR) ? (
          <circle key={`home${arm}`} cx={home.center.x} cy={home.center.y} r={home.room * HOME_PAD} className="fill-white stroke-ink" {...hair} />
        ) : null,
      )}
      {layout.bases.map((base, arm) => (
        <g key={arm} style={paintOf(owners[arm] ?? null)}>
          {base.spots.map((spot, i) => (covered(spot, HIDES.socket) ? null : <circle key={i} cx={spot.x} cy={spot.y} r={base.socket} className="fill-player-tint stroke-player" {...hair} />))}
        </g>
      ))}
    </svg>
  );
}
