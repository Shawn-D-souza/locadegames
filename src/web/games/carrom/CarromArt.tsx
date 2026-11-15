import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import { strokes } from "../../../theme";
import { playerStyle } from "../../utils/playerStyle";
import { CARROM_LOOK } from "./look";

/**
 * The game tile: the whole board as it lies in the game, your side at the bottom: the wood frame, the four corner holes,
 * the baselines, the coins packed round the magenta queen in the middle (white and black taking turns), and the striker
 * on the bottom baseline in a player's color, the way a break looks (no arrow: owner direction, none in the game
 * either). In board units, the discs drawn bigger than the game's so they read at tile size.
 */
const S = CARROM_CONFIG.board.size;
const MID = S / 2;
const F = CARROM_LOOK.frame;
const SIZE = S + 2 * F;
const COIN = 4.4;
const STRIKER = 6;
const HOLE = 6.4;
const BASE = { inset: 14, half: 30, gap: 5 } as const;
/** The honeycomb round the queen: the six touching her, then the twelve round those. */
const D = 2 * COIN + 0.3;
const H = (D * Math.sqrt(3)) / 2;
const RING = [
  [D, 0],
  [D / 2, H],
  [-D / 2, H],
  [-D, 0],
  [-D / 2, -H],
  [D / 2, -H],
] as const;
const COINS = [
  ...RING.map(([x, y], i) => ({ x, y, black: i % 2 === 1 })),
  ...RING.flatMap(([x, y], i) => {
    const [nx, ny] = RING[(i + 1) % 6]!;
    return [
      { x: 2 * x, y: 2 * y, black: true },
      { x: x + nx, y: y + ny, black: false },
    ];
  }),
];
const STRIKER_Y = S - BASE.inset;
const PLAYER = 1;

export function CarromArt() {
  const line = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: strokes.thin };
  const hair = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: strokes.hair };
  return (
    <div className="relative size-full overflow-hidden rounded-art-cell border-thin border-ink bg-carrom-frame" aria-hidden="true">
      <svg viewBox={`${-F} ${-F} ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
        {/* Its corners curve round the holes exactly, as on the board in the game. */}
        <rect x={0} y={0} width={S} height={S} rx={HOLE} className="fill-carrom-board stroke-ink" {...line} />
        {[0, 1, 2, 3].map((turn) => (
          <g key={turn} transform={`rotate(${turn * 90} ${MID} ${MID})`} className="fill-none stroke-carrom-line" {...hair}>
            <line x1={MID - BASE.half} y1={S - BASE.inset - BASE.gap} x2={MID + BASE.half} y2={S - BASE.inset - BASE.gap} {...hair} />
            <line x1={MID - BASE.half} y1={S - BASE.inset + BASE.gap} x2={MID + BASE.half} y2={S - BASE.inset + BASE.gap} {...hair} />
          </g>
        ))}
        {[
          [HOLE, HOLE],
          [S - HOLE, HOLE],
          [HOLE, S - HOLE],
          [S - HOLE, S - HOLE],
        ].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={HOLE} className="fill-carrom-pocket" />
        ))}
        {COINS.map((c) => (
          <circle key={`${c.x},${c.y}`} cx={MID + c.x} cy={MID + c.y} r={COIN} className={c.black ? "fill-carrom-black stroke-ink" : "fill-white stroke-ink"} {...line} />
        ))}
        <circle cx={MID} cy={MID} r={COIN} className="fill-carrom-queen stroke-ink" {...line} />
        <g style={playerStyle(PLAYER)}>
          <circle cx={MID} cy={STRIKER_Y} r={STRIKER} className="fill-player stroke-ink" {...line} />
        </g>
      </svg>
    </div>
  );
}
