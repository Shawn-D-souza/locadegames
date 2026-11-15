import { PROMOTION_KINDS, type PromotionKind } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import { hapticTarget } from "../../services/hapticPlayer";
import { playerStyle } from "../../utils/playerStyle";
import { ChessPiece } from "./ChessPiece";

interface PromotionPickerProps {
  seat: Seat;
  /** Your player id: the choices are in your color. */
  colorIndex: number;
  onPick(kind: PromotionKind): void;
  /** A tap beside the choices: the pawn goes back. */
  onCancel(): void;
}

/**
 * Your pawn reached the far row: what does it become? A white card over the board with the four pieces in your color
 * (owner decision: you pick, not always a queen); a tap anywhere else puts the pawn back.
 */
export function PromotionPicker({ seat, colorIndex, onPick, onCancel }: PromotionPickerProps) {
  return (
    // Over the whole board, its corners rounded with it.
    <div className="absolute inset-0 z-raised flex items-center justify-center overflow-hidden rounded-small-board" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" className="absolute inset-0 cursor-default bg-backdrop" aria-label="Keep the pawn" onClick={onCancel} />
      <div
        role="group"
        aria-label="Promote your pawn to"
        className="relative grid grid-cols-4 gap-2 rounded-card border-thin border-ink bg-white p-3 shadow-lip-medium"
        style={playerStyle(colorIndex)}
      >
        {PROMOTION_KINDS.map((kind) => (
          <button
            key={kind}
            ref={hapticTarget}
            type="button"
            aria-label={`Promote to ${kind}`}
            className="size-mark-badge rounded-control border-thin border-ink bg-white p-1 active:bg-player-light"
            onClick={() => onPick(kind)}
          >
            <ChessPiece kind={kind} seat={seat} viewer={seat} className="size-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
