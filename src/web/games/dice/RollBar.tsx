import type { ReactNode } from "react";
import { PillButton } from "../../components/PillButton";
import { Die } from "./Die";

interface RollBarProps {
  /** The die's face (the last roll), or null before anyone has rolled. */
  face: number | null;
  /** How far into the die's tumble (ms), while a roll plays out. */
  tumbleMs: number | null;
  /** Your roll: the coral ROLL! (ROLL AGAIN! after a 6); otherwise `banner` says whose turn it is. */
  canRoll: boolean;
  again: boolean;
  /** Seconds left of your roll, near the end. */
  countdown: number | null;
  onRoll(): void;
  banner: ReactNode;
}

/**
 * Under the board, near your thumb: the die, and beside it either the one loud action on your turn (ROLL!, with its last
 * seconds) or the banner saying whose turn it is and, at the end, how it ended for you.
 */
export function RollBar({ face, tumbleMs, canRoll, again, countdown, onRoll, banner }: RollBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Die face={face} tumbleMs={tumbleMs} className="size-tap" />
      {canRoll ? (
        <PillButton key={again ? "again" : "roll"} className="flex-1 animate-pop-in" onClick={onRoll}>
          {again ? "ROLL AGAIN!" : "ROLL!"}
          {countdown !== null && (
            <span
              className="inline-flex size-avatar-small flex-none items-center justify-center rounded-pill border-thin border-ink bg-white font-display font-black text-ink tabular-nums"
              role="timer"
              aria-label={`${countdown} seconds left`}
            >
              {countdown}
            </span>
          )}
        </PillButton>
      ) : (
        <div className="min-w-0 flex-1">{banner}</div>
      )}
    </div>
  );
}
