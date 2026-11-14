import { clsx } from "clsx";
import { strokes } from "../../../theme";
import { playerStyle } from "../../utils/playerStyle";
import { Ladder, Snake } from "./BoardArt";
import { spineBetween, SQUARE } from "./geometry";
import { Pawn } from "../../components/Pawn";

/**
 * The game tile: a 3 × 3 corner of the board, everything at the board's own scale, so each thing sits in its
 * squares as it does in the game (owner direction 2026-11-14: a diagonal ladder and a thin snake looked weak; then a
 * close-up made the squares too big for what stood on them). A ladder climbs two squares up the left column with a
 * red pawn standing at its foot, a speckled snake winds down from the top-right square, and the die lies in the
 * bottom-right square, showing a 6.
 */
const SIZE = 3;
const VIEW = SIZE * SQUARE;
/** A spot on the board in squares (column, row from the top; .5 is a square's middle). */
const at = (col: number, row: number) => ({ x: col * SQUARE, y: row * SQUARE });

const LADDER = { foot: at(0.5, 2.62), top: at(0.5, 0.38) } as const;
const SNAKE = { head: at(2.45, 0.42), tail: at(1.45, 2.6) } as const;
/** The pawn: where its base sits (in squares) and how wide it is (the board's own piece size, a share of the tile). */
const PAWN = { player: 0, col: 0.5, row: 2.82, width: "w-1/5" } as const;
/** The die, in board units: its centre, size (as on the board, a little over half a square), corner, tilt, the face's pips (3 × 3 spots, 0–8), their size and the lip under it. */
const DIE = { ...at(2.5, 2.48), size: 5.4, corner: 1.1, tilt: -12, pips: [0, 2, 3, 5, 6, 8], pip: 0.6, lip: 0.6 } as const;

/** The die from the roll bar, drawn into the tile: white, ink pips, outlined, with its lip. */
function TileDie() {
  const half = DIE.size / 2;
  const square = { x: -half, y: -half, width: DIE.size, height: DIE.size, rx: DIE.corner };
  return (
    <g transform={`translate(${DIE.x} ${DIE.y}) rotate(${DIE.tilt})`}>
      <rect {...square} y={-half + DIE.lip} className="fill-ink" />
      <rect {...square} className="fill-white stroke-ink" strokeWidth={strokes.thin} vectorEffect="non-scaling-stroke" />
      {DIE.pips.map((spot) => (
        <circle key={spot} cx={((spot % 3) - 1) * half * 0.55} cy={(Math.floor(spot / 3) - 1) * half * 0.55} r={DIE.pip} className="fill-ink" />
      ))}
    </g>
  );
}

/** A corner of the board for the game tile: squares in turn, a ladder, a snake, a pawn and the die. */
export function SnakesLaddersArt() {
  return (
    <div className="relative size-full overflow-hidden rounded-art-cell border-thin border-ink bg-white" aria-hidden="true">
      <div className="grid size-full" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => (
          <span key={i} className={clsx(((i % SIZE) + Math.floor(i / SIZE)) % 2 === 0 ? "bg-snakes-square" : "bg-white")} />
        ))}
      </div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full">
        <Ladder foot={LADDER.foot} top={LADDER.top} />
        <Snake spine={spineBetween(SNAKE.head, SNAKE.tail, 1)} />
        <TileDie />
      </svg>
      <span
        className={clsx("absolute -translate-x-1/2 -translate-y-full", PAWN.width)}
        style={{ ...playerStyle(PAWN.player), left: `${(PAWN.col / SIZE) * 100}%`, top: `${(PAWN.row / SIZE) * 100}%` }}
      >
        <Pawn className="block w-full" />
      </span>
    </div>
  );
}
