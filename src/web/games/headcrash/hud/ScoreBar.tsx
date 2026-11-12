import type { PlayerId } from "../../../../shared/rooms/types";
import { playerStyle } from "../../../utils/playerStyle";

interface ScoreBarProps {
  /** By seat: the left car's driver, then the right car's. */
  players: readonly [{ id: PlayerId; name: string }, { id: PlayerId; name: string }];
  score: readonly [number, number];
}

/**
 * The score: a tab hanging from the top edge of the screen, split down the middle by an ink line. Each half is filled
 * with its driver's color and holds their points, on the side their car starts on. A new point pops.
 */
export function ScoreBar({ players, score }: ScoreBarProps) {
  const half = (seat: 0 | 1) => (
    <div
      style={playerStyle(players[seat].id)}
      className={
        seat === 0
          ? "flex min-w-score-side items-center justify-center border-r-thin border-ink bg-player px-3 pt-1 pb-2"
          : "flex min-w-score-side items-center justify-center bg-player px-3 pt-1 pb-2"
      }
    >
      <span
        key={score[seat]}
        className="animate-pop-in font-display text-title font-black text-player-text"
      >
        {score[seat]}
      </span>
    </div>
  );
  return (
    <div
      className="flex overflow-hidden rounded-b-control border-x-thin border-b-thin border-ink"
      role="status"
      aria-label={`${players[0].name} ${score[0]}, ${players[1].name} ${score[1]}`}
    >
      {half(0)}
      {half(1)}
    </div>
  );
}
