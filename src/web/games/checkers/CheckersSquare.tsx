import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Seat, Square } from "../../../shared/games/checkers/types";
import { playerStyle } from "../../utils/playerStyle";
import { Checker } from "./Checker";

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

/** A corner square is rounded to fit just inside the board's outline. */
const CORNER_CLASSES: Record<Corner, string> = {
  topLeft: "rounded-tl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  topRight: "rounded-tr-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  bottomLeft: "rounded-bl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
  bottomRight: "rounded-br-[calc(var(--radius-small-board)-var(--stroke-thin))]",
};

interface CheckersSquareProps {
  /** Drawn in one of the board's corners. */
  corner: Corner | null;
  /** A dark square, where pieces stand; the light ones are white and always empty. */
  dark: boolean;
  /** The piece shown on it (none while it's the one moving over the board). */
  piece: Square;
  /** Player id whose color paints the piece (and the square, when it's picked up from here or must capture). */
  colorIndex: number | null;
  /** Whose phone it is: your own pieces carry the ring. */
  viewer: Seat | null;
  /** Read out by screen readers (dark squares only). */
  label: string;
  /** Where the last move started or ended: a little deeper, so you see what just moved. */
  trail: boolean;
  /** Your picked piece can go here: a dot. */
  target: boolean;
  /** Your piece is picked up here: the square takes your light color, ringed in your color. */
  picked: boolean;
  /** A capture must be taken and this piece can take one: its square takes your light color, its ring pulsing. */
  mustMove: boolean;
  /** It's being jumped: it shrinks away this many ms from now. */
  takenAtMs: number | null;
  /** The winner is looking and this is one of theirs: the pieces jump one after another. */
  celebrate: boolean;
  hopOrder: number;
  /** After a win: the loser's pieces fade back. */
  faded: boolean;
}

/**
 * One square of the board, with its piece: light or dark, the last move's trail, your light color where you picked a
 * piece up (and under the pieces that must capture), ringed in your color, a dot where your piece can go.
 */
export function CheckersSquare({ corner, dark, piece, colorIndex, viewer, label, trail, target, picked, mustMove, takenAtMs, celebrate, hopOrder, faded }: CheckersSquareProps) {
  return (
    <span
      role={dark ? "img" : undefined}
      aria-label={dark ? label : undefined}
      aria-hidden={dark ? undefined : true}
      className={clsx(
        "relative aspect-square transition-colors duration-fast ease-out",
        corner && CORNER_CLASSES[corner],
        // The light squares let the board show through: white, and the winner's color as a win fills it.
        !dark ? "bg-transparent" : picked || mustMove ? "bg-player-light" : trail ? "bg-checker-trail" : "bg-checker-square",
      )}
      style={colorIndex !== null ? playerStyle(colorIndex) : undefined}
    >
      {/*
        Picked up, or must capture: a ring in your full color inside the square's edge, over the light fill. The fill
        alone is about as light as the square for many colors (blue, green, yellow…); the ring shows on every one.
        A piece that must capture keeps its fill and its ring pulses.
      */}
      {(picked || mustMove) && <span className={clsx("absolute inset-0 border-outline border-player", mustMove && "animate-live")} />}
      {target && <span className="absolute inset-[34%] rounded-pill bg-ink opacity-checker-target" />}
      {piece && (
        <span
          className={clsx(
            "absolute inset-[10%]",
            takenAtMs !== null && "animate-checker-taken",
            faded && "animate-fade-back",
            celebrate && "origin-[50%_90%] animate-mark-hop",
          )}
          style={{ "--hop-order": hopOrder, "--taken-at": `${takenAtMs ?? 0}ms` } as CSSProperties}
        >
          <Checker seat={piece.seat} viewer={viewer} king={piece.king} className="size-full" />
        </span>
      )}
    </span>
  );
}
