import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Square } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import { playerStyle } from "../../utils/playerStyle";
import { ChessPiece } from "./ChessPiece";

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

/** A corner square is rounded to fit just inside the board's outline. */
const CORNER_CLASSES: Record<Corner, string> = {
  topLeft: "rounded-tl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  topRight: "rounded-tr-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  bottomLeft: "rounded-bl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  bottomRight: "rounded-br-[calc(var(--radius-small-board)-var(--stroke-thin))]",
};

interface ChessSquareProps {
  corner: Corner | null;
  /** A light square: white (the board shows through); the dark ones are pale indigo. */
  light: boolean;
  /** The piece shown on it (none while it's the one moving over the board). */
  piece: Square;
  /** Player id whose color paints the piece (and the square, when you picked a piece up here). */
  colorIndex: number | null;
  /** Whose phone it is: your own pieces carry the band. */
  viewer: Seat | null;
  label: string;
  /** A king in check stands here: pale coral. */
  check: boolean;
  /** Your piece is picked up here: the square takes your light color, ringed in your color. */
  picked: boolean;
  /** Your picked piece can go here: a dot, or a ring round the piece it would take. */
  target: boolean;
  /** It's being taken: it shrinks away this many ms from now. */
  takenAtMs: number | null;
  /** The winner is looking and this is one of theirs: the pieces jump one after another. */
  celebrate: boolean;
  hopOrder: number;
  /** After a win: the loser's pieces fade back. */
  faded: boolean;
}

/**
 * One square of the board, with its piece: light or dark (no trail of the last move: owner decision), a king in check, your light color
 * where you picked a piece up (ringed in your color), a dot where it can go, a ring round a piece it can take.
 */
export function ChessSquare({ corner, light, piece, colorIndex, viewer, label, check, picked, target, takenAtMs, celebrate, hopOrder, faded }: ChessSquareProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={clsx(
        "relative aspect-square transition-colors duration-fast ease-out",
        corner && CORNER_CLASSES[corner],
        // The light squares let the board show through: white, and the winner's color as a win fills it.
        picked ? "bg-player-light" : check ? "bg-chess-check" : light ? "bg-transparent" : "bg-checker-square",
      )}
      style={colorIndex !== null ? playerStyle(colorIndex) : undefined}
    >
      {/* Picked up: a ring in your full color inside the square's edge, over the light fill (which alone is about as pale as the square for many colors). */}
      {picked && <span className="absolute inset-0 border-outline border-player" />}
      {target && !piece && <span className="absolute inset-[36%] rounded-pill bg-ink opacity-checker-target" />}
      {target && piece && <span className="absolute inset-[4%] rounded-pill border-outline-thick border-ink opacity-checker-target" />}
      {piece && (
        <span
          className={clsx(
            "absolute inset-[6%]",
            takenAtMs !== null && "animate-checker-taken",
            faded && "animate-fade-back",
            celebrate && "origin-[50%_90%] animate-mark-hop",
          )}
          style={{ "--hop-order": hopOrder, "--taken-at": `${takenAtMs ?? 0}ms` } as CSSProperties}
        >
          <ChessPiece kind={piece.kind} seat={piece.seat} viewer={viewer} className="size-full" />
        </span>
      )}
    </span>
  );
}
