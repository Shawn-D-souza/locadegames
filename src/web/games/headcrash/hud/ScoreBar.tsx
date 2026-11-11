import type { PlayerId } from "../../../../shared/rooms/types";
import { playerStyle } from "../../../utils/playerStyle";

interface ScoreBarProps {
  /** By seat: the left car's driver, then the right car's. */
  players: readonly [{ id: PlayerId; name: string }, { id: PlayerId; name: string }];
  score: readonly [number, number];
}

/**
 * The score: a small white tab hanging from the top edge of the screen, each driver's points on a disc in their
 * color, on the side their car starts on. It takes almost no room from the world. A new point pops.
 */
export function ScoreBar({ players, score }: ScoreBarProps) {
  const points = (seat: 0 | 1) => (
    <span
      key={`${seat}:${score[seat]}`}
      style={playerStyle(players[seat].id)}
      className="flex size-icon animate-pop-in items-center justify-center rounded-pill border-thin border-ink bg-player font-display text-label font-black text-player-text"
    >
      {score[seat]}
    </span>
  );
  return (
    <div
      className="flex items-center gap-2 rounded-b-control border-x-thin border-b-thin border-ink bg-white px-3 pt-1 pb-2"
      role="status"
      aria-label={`${players[0].name} ${score[0]}, ${players[1].name} ${score[1]}`}
    >
      {points(0)}
      <span className="size-1 rounded-pill bg-ink" />
      {points(1)}
    </div>
  );
}
