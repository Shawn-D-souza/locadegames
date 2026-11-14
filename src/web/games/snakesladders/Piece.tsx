import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { Point } from "./geometry";
import { Pawn } from "./Pawn";

interface PieceProps {
  /** Where its middle is, in board units (the board is 100 across). */
  at: Point;
  /** How high off the board it is (a hop), in board units: it rises on screen. */
  lift?: number;
  /** 1 full size; less when it shares a square, 0 off the board. */
  scale: number;
  /** 0 as made; more flattens it onto its base (wider, shorter) as it lands. */
  squash?: number;
  paint: CSSProperties;
  /** Your own pawn: a white dot on its body. */
  mine: boolean;
  /** On the move: drawn over everyone else. */
  moving?: boolean;
}

/** A player's pawn on the board, squashing down onto its base as it lands. */
export function Piece({ at, lift = 0, scale, squash = 0, paint, mine, moving = false }: PieceProps) {
  return (
    <span
      className={clsx("absolute w-(--snakes-board-piece) origin-bottom -translate-1/2", moving && "z-raised")}
      style={{ ...paint, left: `${at.x}%`, top: `${at.y - lift}%`, scale: `${scale * (1 + squash)} ${scale * (1 - squash)}` }}
      aria-hidden="true"
    >
      <Pawn mine={mine} className="block w-full" />
    </span>
  );
}
