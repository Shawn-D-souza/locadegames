import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { squareCell } from "../../../shared/games/snakesladders/board";
import { SNAKESLADDERS_CONFIG } from "../../../shared/games/snakesladders/config";
import { GoldCrown } from "../../components/GoldCrown";
import { BoardArt } from "./BoardArt";
import { clusterSpots, squareCenter, type PiecePose } from "./geometry";
import { Piece } from "./Piece";

const { columns, finish } = SNAKESLADDERS_CONFIG;

/** The squares in screen order: the top row first (91–100 … read right to left there), left to right. */
const SQUARES = Array.from({ length: finish }, (_, i) => i + 1).sort((a, b) => {
  const ca = squareCell(a);
  const cb = squareCell(b);
  return cb.row - ca.row || ca.col - cb.col;
});

export interface BoardPiece {
  key: number;
  /** Their square: 0 before their first roll (not on the board yet). */
  square: number;
  paint: CSSProperties;
  mine: boolean;
}

interface SnakesBoardProps {
  /** Every piece at rest (not the one moving), in turn order. */
  pieces: readonly BoardPiece[];
  /** The piece playing out a roll, where it is right now. */
  moving: (Omit<BoardPiece, "square"> & { pose: PiecePose }) | null;
  /** The game just ended: the board thumps. */
  ended: boolean;
  /** For screen readers: where everyone is. */
  label: string;
}

/**
 * The board: 10 × 10 squares numbered up from the bottom-left, white and pale lavender in turn, in one ink-outlined
 * card; its ladders and snakes drawn over them; the last square crowned. Pieces sharing a square huddle in it, smaller.
 */
export function SnakesBoard({ pieces, moving, ended, label }: SnakesBoardProps) {
  const bySquare = new Map<number, BoardPiece[]>();
  for (const piece of pieces) if (piece.square > 0) bySquare.set(piece.square, [...(bySquare.get(piece.square) ?? []), piece]);
  return (
    <div
      className={clsx("@container relative aspect-square w-full overflow-hidden rounded-card border-thin border-ink bg-white", ended && "animate-board-thump")}
      role="img"
      aria-label={label}
    >
      <div className="grid size-full" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {SQUARES.map((square) => {
          const { col, row } = squareCell(square);
          return (
            <span key={square} className={clsx("relative", (col + row) % 2 === 0 ? "bg-snakes-square" : "bg-white")}>
              <span className="absolute top-(--snakes-board-number-inset) left-(--snakes-board-number-inset) font-body text-[min(var(--snakes-board-number),var(--type-caption-size))] leading-none font-bold text-section-label">
                {square}
              </span>
              {square === finish && <GoldCrown className="absolute top-1/2 left-1/2 w-3/5 -translate-1/2" />}
            </span>
          );
        })}
      </div>
      <BoardArt />
      <div className="absolute inset-0">
        {[...bySquare.entries()].flatMap(([square, here]) => {
          const center = squareCenter(square);
          const { offsets, scale } = clusterSpots(here.length);
          return here.map((piece, i) => (
            <Piece key={piece.key} at={{ x: center.x + offsets[i]!.x, y: center.y + offsets[i]!.y }} scale={scale} paint={piece.paint} mine={piece.mine} />
          ));
        })}
        {moving && moving.pose.scale > 0 && (
          <Piece key={moving.key} at={moving.pose} lift={moving.pose.lift} scale={moving.pose.scale} squash={moving.pose.squash} paint={moving.paint} mine={moving.mine} moving />
        )}
      </div>
    </div>
  );
}
