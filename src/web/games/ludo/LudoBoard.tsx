import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { PAWN_ASPECT, Pawn } from "../../components/Pawn";
import { hapticTarget } from "../../services/hapticPlayer";
import { BoardArt, type ArmOwner } from "./BoardArt";
import { BoardMarks } from "./BoardMarks";
import type { LudoLayout } from "./geometry";
import type { PlacedPawn } from "./placePawns";

/**
 * A pawn's width, as a share of a square; the target round one you may move, as a share of a square at a track pawn's
 * size (bigger than the pawn, so a small board is still easy to tap; as small as the pawn is in a base, so the bases'
 * pawns, closer together, each keep their own).
 */
const PAWN_WIDTH = 0.82;
const PICK_TARGET = 1.5;

export interface BoardPawn extends PlacedPawn {
  paint: CSSProperties;
  /** Your own: a white dot on its body. */
  mine: boolean;
  /** You may move it now: it hops, and tapping it moves it. */
  onPick?: () => void;
}

interface LudoBoardProps {
  layout: LudoLayout;
  owners: readonly (ArmOwner | null)[];
  pawns: readonly BoardPawn[];
  /** The game just ended: the board thumps. */
  ended: boolean;
  /** For screen readers: where everyone is. */
  label: string;
}

/**
 * The board: its drawing, the stars and sockets no pawn covers, then every pawn standing on it (the logo's pawn in its
 * player's color), those on the move over the rest. While you choose which pawn to move, the ones you can move hop and
 * a round target over each takes the tap. Where a pawn would land isn't shown (owner decision: counting is the
 * players' own).
 */
export function LudoBoard({ layout, owners, pawns, ended, label }: LudoBoardProps) {
  const width = layout.cell * PAWN_WIDTH;
  // A pawn shrinks toward its foot (so a hop's squash lands on it), which sinks a smaller one below its spot: raised by
  // as much, its middle stays on its spot, so pawns huddled at home or waiting in a base sit centred in their circle.
  const sink = (scale: number) => ((1 - scale) * width * PAWN_ASPECT) / 2;
  return (
    <div
      className={clsx("relative aspect-square w-full", layout.framed && "overflow-hidden rounded-card border-thin border-ink bg-ludo-board", ended && "animate-board-thump")}
      role="img"
      aria-label={label}
    >
      <BoardArt layout={layout} owners={owners} />
      <BoardMarks layout={layout} owners={owners} pawnsAt={pawns.map((p) => p.at)} />
      {pawns.map((p) => (
        <span
          key={`${p.seat}:${p.pawn}`}
          className={clsx("absolute origin-bottom -translate-1/2", p.moving && "z-raised")}
          style={{
            ...p.paint,
            width: `${width}%`,
            left: `${p.at.x}%`,
            top: `${p.at.y - p.lift - sink(p.scale)}%`,
            scale: `${p.scale * (1 + p.squash)} ${p.scale * (1 - p.squash)}`,
          }}
          aria-hidden="true"
        >
          <Pawn mine={p.mine} className={clsx("block w-full", p.onPick && "animate-turn-hop")} />
        </span>
      ))}
      {pawns.map((p) =>
        p.onPick ? (
          <button
            key={`pick${p.seat}:${p.pawn}`}
            ref={hapticTarget}
            type="button"
            className="absolute z-raised -translate-1/2 rounded-pill"
            style={{ left: `${p.at.x}%`, top: `${p.at.y}%`, width: `${layout.cell * PICK_TARGET * p.scale}%`, height: `${layout.cell * PICK_TARGET * p.scale}%` }}
            aria-label={`Move pawn ${p.pawn + 1}`}
            onClick={p.onPick}
          />
        ) : null,
      )}
    </div>
  );
}
