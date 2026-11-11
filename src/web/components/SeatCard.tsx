import { clsx } from "clsx";
import type { Seat } from "../../shared/games/types";
import { playerStyle } from "../utils/playerStyle";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Mark } from "./Mark";

type PieceMotion = "hop" | "droop" | "shrug";

interface SeatCardProps {
  player: { id: number; name: string; connected: boolean };
  /** The piece this player plays (X or O). Left out for a game without pieces (the round intro of a real-time game): their avatar shows. */
  seat?: Seat;
  isYou: boolean;
  /** Lit in the player's color: their turn, or the winner once decided. */
  active: boolean;
  /** Seconds left on this player's turn, shown only near the end (null: not yet). Left out, the card has no timer row (round intro). */
  countdown?: number | null;
  /** On the winner's own phone: a crown drops on, the card bounces and stays a little bigger. */
  celebrate?: boolean;
  /** On the loser's own phone: a small sad shake, then the card fades a little. */
  defeated?: boolean;
  /** The piece on the card reacts once the match ends: a happy spinning jump, a sad droop (it stays tipped), or a draw's shrug. */
  pieceMotion?: PieceMotion | null;
}

const PIECE_MOTION_CLASSES: Record<PieceMotion, string> = {
  hop: "origin-bottom animate-piece-hop",
  droop: "origin-bottom animate-piece-droop",
  shrug: "animate-piece-shrug",
};

/** Small ink pill (the YOU / AWAY tab, the countdown). */
const PILL_CLASSES = "rounded-pill bg-ink px-2 py-1 text-badge tracking-badge text-white";

/**
 * One side of a match: piece (or avatar), name, YOU / AWAY tab on the top edge. Lit means "their turn" (or "winner"),
 * so no extra words. Not tappable, so no lip.
 */
export function SeatCard({ player, seat, isYou, active, countdown, celebrate, defeated, pieceMotion = null }: SeatCardProps) {
  const tab = !player.connected ? "AWAY" : isYou ? "YOU" : null;
  return (
    <div
      className={clsx(
        "relative flex min-w-0 flex-col items-center gap-2 rounded-control border-thin border-ink px-3 pt-4 pb-3",
        "transition-colors duration-normal ease-out",
        active ? "bg-player text-player-text" : "bg-white text-ink",
        celebrate && "animate-card-win",
        defeated && "animate-card-lose",
        !player.connected && "opacity-disconnected",
      )}
      style={playerStyle(player.id)}
    >
      {tab && <span className={clsx(PILL_CLASSES, "absolute top-0 left-1/2 -translate-1/2")}>{tab}</span>}
      {/* Tilted like the badges, it drops onto the card's corner. */}
      {celebrate && (
        <Icon
          name="crown"
          className="absolute top-0 left-0 size-mark-badge translate-x-[-30%] -translate-y-1/2 rotate-(--transform-badge-tilt) animate-crown fill-waiting stroke-ink"
        />
      )}
      {seat === undefined ? (
        <Avatar name={player.name} colorIndex={player.id} />
      ) : (
        // The piece on a white disc, so it reads on every player color.
        <span className={clsx("inline-flex size-mark-badge rounded-pill border-thin border-ink bg-white p-1", pieceMotion && PIECE_MOTION_CLASSES[pieceMotion])}>
          <Mark seat={seat} className="size-full" />
        </span>
      )}
      <span className="line-clamp-2 max-w-full text-center wrap-break-word">{player.name}</span>
      {/* Always there in a match (hidden until the last seconds), so the card never jumps when it appears. */}
      {countdown !== undefined && (
        <span
          className={clsx(PILL_CLASSES, "border-thin border-ink", countdown === null && "invisible")}
          role={countdown === null ? undefined : "timer"}
          aria-label={countdown === null ? undefined : `${countdown} seconds left`}
          aria-hidden={countdown === null}
        >
          {countdown ?? 0}
        </span>
      )}
    </div>
  );
}
