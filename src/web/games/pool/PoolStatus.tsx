interface PoolStatusProps {
  /** Whose shot: YOUR SHOT!, ANA'S SHOT, ANA SHOOTS AGAIN. */
  text: string;
  /** A quieter second line: what just happened (a foul, someone out), how to shoot (until your first shot), that you're out, or watching. */
  detail: string | null;
  /** Seconds left, near the end. */
  countdown: number | null;
}

/**
 * Whose shot it is, under the players' row: a small white card with an ink outline (owner direction: no big box under
 * the table, and readable on every player's color, never ink straight on the screen's wash), the last seconds in a
 * bubble beside the words, in a line as tall as the bubble so it never jumps.
 */
export function PoolStatus({ text, detail, countdown }: PoolStatusProps) {
  return (
    <div className="flex max-w-full flex-col items-center self-center rounded-card border-thin border-ink bg-white px-4 py-1 text-center text-ink" role="status">
      <span className="flex h-avatar-small items-center gap-2">
        <span className="truncate font-display text-label font-black uppercase">{text}</span>
        {countdown !== null && (
          <span
            className="inline-flex size-avatar-small flex-none items-center justify-center rounded-pill border-thin border-ink bg-white font-display font-black tabular-nums"
            role="timer"
            aria-label={`${countdown} seconds left`}
          >
            {countdown}
          </span>
        )}
      </span>
      {detail && <span className="max-w-full truncate text-caption">{detail}</span>}
    </div>
  );
}
