import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { shipLength } from "../../../shared/games/seabattle/fleet";

/**
 * A ship seen from above, drawn in its player's color with ink outlines (the platform's flat style). Each place in the
 * fleet has its own outline, so they tell apart at a glance: the 5 an aircraft carrier (angular flight deck with its
 * angled landing strip jutting out, the island on a bulge of the edge), the 4 a battleship (long, widest amidships, a
 * sharp bow, three turrets), the first 3 a cruiser (slim, square stern, two funnels), the second 3 a submarine (a
 * rounded cigar with its tail fins, a sail), the 2 a patrol boat (short and beamy, square stern, two outboard motors, a
 * cabin). Each is one outline with everything inside it.
 * Drawn lying across with its bow to the right, 100 units per cell; standing, the same drawing turned, bow down.
 */

const CELL = 100;
const MID = CELL / 2;
/** Outlines stay the platform's widths at any size. */
const LINE: CSSProperties = { strokeWidth: "var(--stroke-thin)" };
const DETAIL: CSSProperties = { strokeWidth: "var(--stroke-hair)" };
const OUTLINED = "stroke-ink [vector-effect:non-scaling-stroke] [stroke-linejoin:round]";
/** Fittings (turrets, bridges, cabins): white, or whatever a wreck's burnt colors make them (`--ship-part`). */
const WHITE_PART = clsx("fill-(--ship-part,var(--color-white))", OUTLINED);
// Each ship is one outline (owner decision): every part lies inside its hull, nothing sticks out, so a whole ship can
// later be filled one color (shot, sunk) at once.

/** The deck: the hull's own outline drawn again a step in (`beam`: how much of the hull's width it keeps). */
function Deck({ d, w, beam, className }: { d: string; w: number; beam: number; className: string }) {
  const along = (w - 2 * MID * 0.56) / w;
  return <path d={d} transform={`translate(${w / 2} ${MID}) scale(${along} ${beam}) translate(${-w / 2} ${-MID})`} className={className} />;
}

/** A gun turret at `x`: a round mount, its two barrels pointing toward the bow (`dir` 1) or the stern (-1). */
function Turret({ x, dir, r = 13 }: { x: number; dir: 1 | -1; r?: number }) {
  const reach = r * 2;
  return (
    <g>
      <path d={`M ${x} ${MID - r * 0.35} H ${x + dir * reach} M ${x} ${MID + r * 0.35} H ${x + dir * reach}`} className={OUTLINED} style={LINE} />
      <circle cx={x} cy={MID} r={r} className={WHITE_PART} style={LINE} />
    </g>
  );
}

function Carrier({ w }: { w: number }) {
  const island = w * 0.5;
  const hull = `M 10 30 L ${w * 0.28} 30 L ${w * 0.42} 10 L ${w * 0.66} 10 L ${w * 0.7} 24 L ${w - 66} 24 L ${w - 6} 42 L ${w - 6} 62 L ${w - 56} 82 L ${island + 78} 82 L ${island + 70} 94 L ${island + 10} 94 L ${island + 2} 82 L 56 82 L 10 72 Z`;
  return (
    <>
      <path d={hull} className={clsx("fill-player", OUTLINED)} style={LINE} />
      <Deck d={hull} w={w} beam={0.8} className="fill-player-dark" />
      {/* The angled landing strip, out over the sponson; the catapults along the bow. */}
      <path d={`M 40 64 L ${w * 0.6} 20`} className="stroke-(--ship-part,var(--color-white)) [stroke-dasharray:8_6] [vector-effect:non-scaling-stroke]" style={LINE} />
      <path d={`M ${w * 0.62} 44 L ${w - 46} 40 M ${w * 0.62} 56 L ${w - 46} 54`} className="stroke-(--ship-part,var(--color-white)) [vector-effect:non-scaling-stroke]" style={DETAIL} />
      {/* The island, on the hull's own bulge at the deck's edge. */}
      <rect x={island + 16} y={76} width={48} height={12} rx={4} className={WHITE_PART} style={DETAIL} />
      <circle cx={island + 30} cy={82} r={3.5} className="fill-ink" />
    </>
  );
}

function Battleship({ w }: { w: number }) {
  const hull = `M 12 50 C 12 32 30 22 74 20 L ${w - 150} 20 C ${w - 70} 22 ${w - 26} 38 ${w - 2} 50 C ${w - 26} 62 ${w - 70} 78 ${w - 150} 80 L 74 80 C 30 78 12 68 12 50 Z`;
  return (
    <>
      <path d={hull} className={clsx("fill-player", OUTLINED)} style={LINE} />
      <Deck d={hull} w={w} beam={0.72} className="fill-player-light" />
      <Turret x={70} dir={-1} />
      {/* The bridge, stepped, with its funnel behind. */}
      <rect x={128} y={34} width={92} height={32} rx={8} className={WHITE_PART} style={LINE} />
      <rect x={176} y={40} width={36} height={20} rx={6} className={WHITE_PART} style={DETAIL} />
      <ellipse cx={148} cy={MID} rx={13} ry={9} className={clsx("fill-ink", OUTLINED)} style={DETAIL} />
      <Turret x={w - 150} dir={1} />
      <Turret x={w - 96} dir={1} r={11} />
    </>
  );
}

function Cruiser({ w }: { w: number }) {
  const hull = `M 8 30 L ${w - 120} 27 C ${w - 60} 28 ${w - 22} 40 ${w - 2} 50 C ${w - 22} 60 ${w - 60} 72 ${w - 120} 73 L 8 70 Z`;
  return (
    <>
      <path d={hull} className={clsx("fill-player", OUTLINED)} style={LINE} />
      <Deck d={hull} w={w} beam={0.62} className="fill-player-light" />
      <Turret x={52} dir={-1} r={10} />
      <ellipse cx={92} cy={MID} rx={11} ry={8} className={clsx("fill-ink", OUTLINED)} style={DETAIL} />
      <ellipse cx={122} cy={MID} rx={11} ry={8} className={clsx("fill-ink", OUTLINED)} style={DETAIL} />
      <rect x={142} y={38} width={48} height={24} rx={7} className={WHITE_PART} style={LINE} />
      <Turret x={w - 86} dir={1} r={10} />
    </>
  );
}

function Submarine({ w }: { w: number }) {
  // The body and its tail fins in one outline.
  const body = `M 8 50 L 16 32 L 30 32 L 40 41 C 58 32 78 29 104 29 L ${w - 64} 29 C ${w - 22} 29 ${w - 4} 40 ${w - 4} 50 C ${w - 4} 60 ${w - 22} 71 ${w - 64} 71 L 104 71 C 78 71 58 68 40 59 L 30 68 L 16 68 Z`;
  return (
    <>
      <path d={body} className={clsx("fill-player", OUTLINED)} style={LINE} />
      <path d={`M 76 50 H ${w - 34}`} className="stroke-player-light [stroke-linecap:round] [vector-effect:non-scaling-stroke]" style={LINE} />
      {/* The sail, with its planes across it. */}
      <path d={`M ${w * 0.62} 36 V 64`} className={clsx(OUTLINED, "[stroke-linecap:round]")} style={LINE} />
      <rect x={w * 0.5} y={39} width={w * 0.22} height={22} rx={11} className={clsx("fill-player-dark", OUTLINED)} style={LINE} />
      <circle cx={w * 0.5 + 15} cy={MID} r={4} className="fill-(--ship-part,var(--color-white))" />
    </>
  );
}

function PatrolBoat({ w }: { w: number }) {
  const hull = `M 10 16 L ${w - 90} 16 C ${w - 44} 18 ${w - 14} 36 ${w - 4} 50 C ${w - 14} 64 ${w - 44} 82 ${w - 90} 84 L 10 84 Q 6 84 6 80 V 20 Q 6 16 10 16 Z`;
  return (
    <>
      <path d={hull} className={clsx("fill-player", OUTLINED)} style={LINE} />
      <Deck d={hull} w={w} beam={0.72} className="fill-player-light" />
      {/* Two outboard motors on the stern. */}
      <rect x={14} y={30} width={14} height={12} rx={4} className="fill-ink" />
      <rect x={14} y={58} width={14} height={12} rx={4} className="fill-ink" />
      {/* The cabin, its windshield facing the bow. */}
      <path d="M 44 30 H 96 Q 112 30 116 50 Q 112 70 96 70 H 44 Q 38 70 38 64 V 36 Q 38 30 44 30 Z" className={WHITE_PART} style={LINE} />
      <path d="M 100 36 Q 110 42 110 50 Q 110 58 100 64" className={clsx("fill-none", OUTLINED)} style={LINE} />
      <Turret x={w - 54} dir={1} r={8} />
    </>
  );
}

const DRAWINGS: Record<number, (props: { w: number }) => ReactNode> = {
  0: Carrier,
  1: Battleship,
  2: Cruiser,
  3: Submarine,
  4: PatrolBoat,
};

interface ShipShapeProps {
  /** Its place in the fleet: which ship, and its length. */
  index: number;
  vertical: boolean;
  className?: string;
}

/** The drawing alone, filling its box (colors from the `--player` variables around it). */
export function ShipShape({ index, vertical, className }: ShipShapeProps) {
  const w = shipLength(index) * CELL;
  const Drawing = DRAWINGS[index]!;
  return (
    <svg viewBox={vertical ? `0 0 ${CELL} ${w}` : `0 0 ${w} ${CELL}`} className={className} aria-hidden="true">
      <g transform={vertical ? `translate(${CELL} 0) rotate(90)` : undefined}>
        <Drawing w={w} />
      </g>
    </svg>
  );
}
