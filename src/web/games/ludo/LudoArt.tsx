import { strokes } from "../../../theme";
import { Pawn } from "../../components/Pawn";
import { playerStyle } from "../../utils/playerStyle";

/**
 * The game tile: the whole classic board, simplified so it reads at a glance at tile size (7 squares across, the arms
 * 2 long): the four yards in four players' colors, each with its white base; the white cross, each arm's home column
 * in its color; the four home triangles in the middle; a gold star; and pawns standing on white so they stand out: one
 * waiting in each base, and one out on the track.
 */
const SIZE = 7;
/** Each arm, clockwise from the bottom: its player, its home column's two squares, and the yard after it clockwise (its top left corner). */
const ARMS = [
  { player: 0, lane: [{ x: 3, y: 5 }, { x: 3, y: 6 }], yard: { x: 0, y: 5 } },
  { player: 1, lane: [{ x: 1, y: 3 }, { x: 0, y: 3 }], yard: { x: 0, y: 0 } },
  { player: 2, lane: [{ x: 3, y: 1 }, { x: 3, y: 0 }], yard: { x: 5, y: 0 } },
  { player: 3, lane: [{ x: 5, y: 3 }, { x: 6, y: 3 }], yard: { x: 5, y: 5 } },
] as const;
/** Each arm's squares (top left corner, columns, rows): bottom, left, top, right. */
const ARM_BLOCKS = [
  { x: 2, y: 5, w: 3, h: 2 },
  { x: 0, y: 2, w: 2, h: 3 },
  { x: 2, y: 0, w: 3, h: 2 },
  { x: 5, y: 2, w: 2, h: 3 },
] as const;
/** The home triangles' outer sides (on the 3 × 3 middle's edge): bottom, left, top, right. */
const HOME_SIDES = [
  [
    { x: 2, y: 5 },
    { x: 5, y: 5 },
  ],
  [
    { x: 2, y: 2 },
    { x: 2, y: 5 },
  ],
  [
    { x: 2, y: 2 },
    { x: 5, y: 2 },
  ],
  [
    { x: 5, y: 2 },
    { x: 5, y: 5 },
  ],
] as const;
/** A base's white disc in its yard, in squares. */
const BASE_RADIUS = 0.72;
/** The star's square (its middle) and reach; the pawns: their player, where they stand (squares from the top left), and how wide (a share of the tile). */
const STAR = { x: 1.5, y: 4.5, r: 0.36 } as const;
const PAWNS = [
  { player: 1, x: 1, y: 1, width: 0.13 },
  { player: 2, x: 6, y: 1, width: 0.13 },
  { player: 1, x: 5.5, y: 2.5, width: 0.13 },
  { player: 3, x: 6, y: 6, width: 0.13 },
  { player: 0, x: 1, y: 6, width: 0.13 },
] as const;

/** A 5-pointed star round `x, y`, `r` across. */
function starPath(x: number, y: number, r: number): string {
  return `${Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const reach = i % 2 === 0 ? r : r * 0.42;
    return `${i === 0 ? "M" : "L"}${(x + Math.cos(a) * reach).toFixed(3)} ${(y + Math.sin(a) * reach).toFixed(3)}`;
  }).join("")}Z`;
}

export function LudoArt() {
  const line = { vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const };
  const hair = { ...line, strokeWidth: strokes.hair };
  const bold = { ...line, strokeWidth: strokes.thin };
  const c = SIZE / 2;
  return (
    <div className="relative size-full overflow-hidden rounded-art-cell border-thin border-ink bg-white" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
        {ARMS.map(({ player, yard }) => (
          <g key={`yard${player}`} style={playerStyle(player)}>
            <rect x={yard.x} y={yard.y} width={2} height={2} className="fill-player stroke-ink" {...bold} />
            <circle cx={yard.x + 1} cy={yard.y + 1} r={BASE_RADIUS} className="fill-white stroke-ink" {...bold} />
          </g>
        ))}
        {ARM_BLOCKS.map((block, arm) =>
          Array.from({ length: block.w * block.h }, (_, i) => {
            const x = block.x + (i % block.w);
            const y = block.y + Math.floor(i / block.w);
            const lane = ARMS[arm]!.lane.some((s) => s.x === x && s.y === y);
            return (
              <rect
                key={`${arm}:${i}`}
                x={x}
                y={y}
                width={1}
                height={1}
                style={lane ? playerStyle(ARMS[arm]!.player) : undefined}
                className={lane ? "fill-player stroke-ink" : "fill-white stroke-ink"}
                {...hair}
              />
            );
          }),
        )}
        {ARM_BLOCKS.map((block, arm) => (
          <rect key={`arm${arm}`} x={block.x} y={block.y} width={block.w} height={block.h} className="fill-none stroke-ink" {...bold} />
        ))}
        {HOME_SIDES.map(([a, b], arm) => (
          <path key={`home${arm}`} d={`M${c} ${c}L${a.x} ${a.y}L${b.x} ${b.y}Z`} style={playerStyle(ARMS[arm]!.player)} className="fill-player stroke-ink" {...hair} />
        ))}
        <rect x={2} y={2} width={3} height={3} className="fill-none stroke-ink" {...bold} />
        <path d={starPath(STAR.x, STAR.y, STAR.r)} className="fill-ludo-star stroke-ink" {...hair} />
      </svg>
      {PAWNS.map((pawn, i) => (
        <span
          key={i}
          className="absolute -translate-1/2"
          style={{ ...playerStyle(pawn.player), left: `${(pawn.x / SIZE) * 100}%`, top: `${(pawn.y / SIZE) * 100}%`, width: `${pawn.width * 100}%` }}
        >
          <Pawn className="block w-full" />
        </span>
      ))}
    </div>
  );
}
