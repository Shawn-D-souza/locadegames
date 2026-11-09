import { clsx } from "clsx";
import type { Cell } from "../../../shared/games/ultimate/types";
import { Mark } from "../../components/Mark";
import { hapticTarget, playHaptic } from "../../services/hapticPlayer";
import { playerStyle } from "../../utils/playerStyle";

interface UltimateCellProps {
  value: Cell;
  /** Player id painting this cell: its mark's, or for an empty cell you can tap, yours (it lights as you press). */
  colorIndex: number | null;
  /** Where it sits in its small board (0–8): the rule lines run between cells, never round the edge. */
  place: number;
  label: string;
  playable: boolean;
  /** The mark just placed: it pops in. */
  fresh: boolean;
  /** Its small board is won or full: the marks fade back as the big mark stamps on. */
  closed: boolean;
  onPlay(): void;
}

/**
 * A new mark pops in. In a closed board marks fade back as the big mark stamps on: those already there by a transition,
 * the one that closed it by an animation (it arrives closed, so there is nothing to transition from).
 */
const MARK_CLASSES = {
  pop: "animate-pop-in",
  popSettle: "animate-pop-settle",
  closed: "opacity-closed-board",
} as const;

function markLook(fresh: boolean, closed: boolean) {
  if (fresh) return closed ? MARK_CLASSES.popSettle : MARK_CLASSES.pop;
  return closed ? MARK_CLASSES.closed : undefined;
}

/** One cell of a small board: thin ink lines between cells (the small board draws the thick ones round it); pressing one you can play lights it in your color. */
export function UltimateCell({ value, colorIndex, place, label, playable, fresh, closed, onPlay }: UltimateCellProps) {
  const col = place % 3;
  const row = Math.floor(place / 3);
  return (
    <button
      ref={hapticTarget}
      type="button"
      className={clsx(
        "flex aspect-square items-center justify-center border-ink transition-colors duration-fast ease-out",
        col < 2 && "border-r-thin",
        row < 2 && "border-b-thin",
        playable && "cursor-pointer active:bg-player-tint",
      )}
      style={colorIndex !== null ? playerStyle(colorIndex) : undefined}
      disabled={!playable}
      aria-label={label}
      onClick={() => {
        // Felt the moment the finger lands; its sound waits until the server has accepted the move.
        playHaptic("ultimateMarkPlaced");
        onPlay();
      }}
    >
      {value !== null && (
        <Mark
          seat={value}
          className={clsx("size-full transition-opacity delay-(--claim-at) duration-celebrate ease-out", markLook(fresh, closed))}
        />
      )}
    </button>
  );
}
