import { POOL_CONFIG } from "../../../shared/games/pool/config";
import { POCKETS } from "../../../shared/games/pool/table";
import { strokes } from "../../../theme";
import { playerStyle } from "../../utils/playerStyle";
import { POOL_LOOK } from "./look";

/**
 * The game tile: the top half of the table as it stands up on a phone (owner direction: as it looks in the game, not a
 * close-up of a corner; half a table is square, like the tile): the wood rail round three sides with the two corner
 * holes at the top (owner direction: no middle holes), the rack with the black in its middle (balls in four players'
 * colors, one with your white dot), and the white cue ball in the middle under it with the cue straight behind it, the
 * way a break looks (owner direction). In table units, with the game's own rail and holes; the balls drawn bigger than
 * the game's, so they read at tile size.
 */
const { length: L } = POOL_CONFIG.table;
const RAIL = POOL_LOOK.rail;
/** The tile: the cloth's width and the rail either side, square. */
const SIZE = POOL_CONFIG.table.width + 2 * RAIL;
const BALL = 2.9;
/** The rack, apex toward the cue ball (tile units from the cloth's top left): rows from the front, each ball's player (or the black). */
const RACK = { x: 25, y: 24, row: BALL * 1.75, across: BALL * 2.02 } as const;
const ROWS: readonly (readonly (number | "black")[])[] = [[0], [1, 2], [3, "black", 0], [2, 1, 3, 0]];
/** The ball with your dot. */
const MINE = { row: 2, ball: 0 } as const;
const CUE_BALL = { x: 25, y: 39 } as const;
/** The cue: its tip this far behind the cue ball, the butt (a player's color) from this far along, thick as drawn. */
const CUE = { gap: BALL + 0.8, joint: 7, length: 40, shaft: 1.3, butt: 2, outline: 0.7, player: 1 } as const;

/** A point on the cloth (from its top left: across, then down from the foot rail) in the tile's units. */
const onTile = (x: number, y: number) => ({ x: x + RAIL, y: y + RAIL });

export function PoolArt() {
  const line = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: strokes.thin };
  const balls = ROWS.flatMap((row, r) =>
    row.map((owner, i) => ({ owner, r, i, ...onTile(RACK.x + (i - (row.length - 1) / 2) * RACK.across, RACK.y - r * RACK.row) })),
  );
  // The table stands up with the foot rail at the top: along it is across the tile, along its length is down. Only
  // the foot rail's corner holes.
  const holes = POCKETS.filter((p) => p.x > L).map((p) => ({ ...onTile(p.y, L - p.x), r: p.r }));
  const cueBall = onTile(CUE_BALL.x, CUE_BALL.y);
  const apex = balls[0]!;
  const toward = Math.hypot(apex.x - cueBall.x, apex.y - cueBall.y);
  const back = { x: (cueBall.x - apex.x) / toward, y: (cueBall.y - apex.y) / toward };
  const along = (d: number) => `${cueBall.x + back.x * (CUE.gap + d)} ${cueBall.y + back.y * (CUE.gap + d)}`;
  return (
    <div className="relative size-full overflow-hidden rounded-art-cell border-thin border-ink bg-pool-rail" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
        <rect x={RAIL} y={RAIL} width={SIZE - 2 * RAIL} height={SIZE} className="fill-pool-cloth" />
        {holes.map((h, i) => (
          <circle key={i} cx={h.x} cy={h.y} r={h.r} className="fill-pool-pocket" />
        ))}
        {balls.map((b) => (
          <g key={`${b.r}:${b.i}`} style={b.owner === "black" ? undefined : playerStyle(b.owner)}>
            <circle cx={b.x} cy={b.y} r={BALL} className={b.owner === "black" ? "fill-pool-black stroke-ink" : "fill-player stroke-ink"} {...line} />
            {b.r === MINE.row && b.i === MINE.ball && <circle cx={b.x} cy={b.y} r={BALL * 0.36} className="fill-white" />}
          </g>
        ))}
        <circle cx={cueBall.x} cy={cueBall.y} r={BALL} className="fill-white stroke-ink" {...line} />
        <g style={playerStyle(CUE.player)}>
          <path d={`M${along(CUE.joint)}L${along(CUE.length)}`} className="stroke-ink" strokeWidth={CUE.butt + CUE.outline} strokeLinecap="round" />
          <path d={`M${along(CUE.joint)}L${along(CUE.length)}`} className="stroke-player" strokeWidth={CUE.butt} strokeLinecap="round" />
          <path d={`M${along(0)}L${along(CUE.joint)}`} className="stroke-ink" strokeWidth={CUE.shaft + CUE.outline} strokeLinecap="round" />
          <path d={`M${along(0)}L${along(CUE.joint)}`} className="stroke-pool-cue-shaft" strokeWidth={CUE.shaft} strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
