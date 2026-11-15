import { clsx } from "clsx";
import type { PieceKind } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import { isRinged } from "../pieceMark";
import { BAND, BASE_WIDTH, PIECE_SHAPES } from "./pieceShapes";

/** Outline and ink marks, in the pieces' 100-unit box. */
const LINE = 4;
const MARK = 2.5;

interface ChessPieceProps {
  kind: PieceKind;
  seat: Seat;
  /** Whose phone it is (their seat, or null watching): your own pieces carry the band. */
  viewer: Seat | null;
  /** No band at all (the tile art). */
  plain?: boolean;
  className?: string;
}

/**
 * A chess piece in its player's color (`--player`) with an ink outline, standing on its two-step base (`PIECE_SHAPES`).
 * Your own have a band pressed into the foot of the base in your dark color, as the ring in Checkers and 4 in a Row
 * (`isRinged`: pieces told apart by color only).
 */
export function ChessPiece({ kind, seat, viewer, plain = false, className }: ChessPieceProps) {
  const shape = PIECE_SHAPES[kind];
  const half = BASE_WIDTH[kind] / 2 - BAND.inset;
  return (
    <svg className={clsx("block", className)} viewBox="0 0 100 100" aria-hidden="true">
      <g className="fill-player stroke-ink" strokeWidth={LINE} strokeLinejoin="round">
        {shape.parts.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {shape.dots?.map((d) => <path key={d} d={d} className="fill-ink" />)}
      {shape.lines?.map((d) => <path key={d} d={d} className="fill-none stroke-ink" strokeWidth={MARK} strokeLinecap="round" />)}
      {!plain && isRinged(seat, viewer) && (
        <line x1={50 - half} x2={50 + half} y1={BAND.y} y2={BAND.y} className="stroke-player-dark opacity-disc-ring" strokeWidth={LINE} strokeLinecap="round" />
      )}
    </svg>
  );
}
