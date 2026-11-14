import { memo } from "react";
import { armSquares } from "../../../shared/games/ludo/board";
import type { PlayerId } from "../../../shared/rooms/types";
import { strokes } from "../../../theme";
import { playerStyle, quitStyle } from "../../utils/playerStyle";
import { pathOf, type LudoLayout, type Point } from "./geometry";

/** The arrow on an arm's tip pointing into its home column: how far it reaches either way along the arm and across it, as shares of a square. */
const ARROW = { tip: 0.32, back: 0.26, wide: 0.3 } as const;

/** Who owns each arm: a player (their color; grey once they quit), or nobody (a free arm on a board bigger than the room: grey). */
export interface ArmOwner {
  id: PlayerId;
  quit: boolean;
}

/** An arm's colors: its player's, or grey once they quit or on a free arm (so the board always looks whole). */
export const paintOf = (owner: ArmOwner | null) => (owner === null || owner.quit ? quitStyle() : playerStyle(owner.id));

interface BoardArtProps {
  layout: LudoLayout;
  /** Per arm: who plays on it. */
  owners: readonly (ArmOwner | null)[];
}

/** An arrow on `center` pointing along `dir` (a unit vector). */
function arrow(center: Point, dir: Point, cell: number): string {
  const at = (along: number, across: number): Point => ({ x: center.x + (dir.x * along - dir.y * across) * cell, y: center.y + (dir.y * along + dir.x * across) * cell });
  return pathOf([at(ARROW.tip, 0), at(-ARROW.back, ARROW.wide), at(-ARROW.back * 0.35, 0), at(-ARROW.back, -ARROW.wide)]);
}

/**
 * The board's drawing (DESIGN.md: ink outlines, flat fills), with one edge: the classic square fills its card, whose
 * border is its edge; a hexagon or an octagon is outlined in ink. Each arm's yard between the arms in its color, with
 * its base in the middle, a white disc; the arms' white squares (thin lines inside, a bolder one along each arm's
 * sides), each arm's start square and home column in its color and an arrow on its tip into it; the middle split into
 * each arm's home triangle. A free arm (more arms than players) is drawn whole, in grey, like a quitter's. The stars
 * and the bases' sockets are `BoardMarks`, as they hide under a pawn.
 */
export const BoardArt = memo(function BoardArt({ layout, owners }: BoardArtProps) {
  const { cell, board } = layout;
  const line = { vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const };
  const hair = { ...line, strokeWidth: strokes.hair };
  const bold = { ...line, strokeWidth: strokes.thin, fill: "none" };
  const paint = (arm: number) => paintOf(owners[arm] ?? null);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
      {layout.yards.map((yard, arm) => (
        <path key={`yard${arm}`} d={pathOf(yard)} style={paint(arm)} className="fill-player" />
      ))}
      {layout.homes.map((home, arm) => (
        <path key={`home${arm}`} d={pathOf(home.corners)} style={paint(arm)} className="fill-player stroke-ink" {...hair} />
      ))}
      {layout.cells.map((c, i) => {
        const start = c.square !== null && c.square % armSquares(board) === board.armLength + 2;
        const colored = c.lane || start;
        return <path key={i} d={pathOf(c.corners)} style={colored ? paint(c.arm) : undefined} className={colored ? "fill-player stroke-ink" : "fill-white stroke-ink"} {...hair} />;
      })}
      {layout.axes.map(({ out }, arm) => (
        <path
          key={`arrow${arm}`}
          d={arrow(layout.track[arm * armSquares(board) + board.armLength]!, { x: -out.x, y: -out.y }, cell)}
          style={paint(arm)}
          className="fill-player stroke-ink"
          {...hair}
        />
      ))}
      {layout.armOutlines.map((o, arm) => (
        <path key={`arm${arm}`} d={pathOf(o, false)} className="stroke-ink" {...bold} />
      ))}
      {!layout.framed && <path d={pathOf(layout.outline)} className="stroke-ink" {...bold} />}
      {layout.bases.map((base, arm) => (
        <circle key={`base${arm}`} cx={base.center.x} cy={base.center.y} r={base.radius} className="fill-white stroke-ink" {...line} strokeWidth={strokes.thin} />
      ))}
    </svg>
  );
});
