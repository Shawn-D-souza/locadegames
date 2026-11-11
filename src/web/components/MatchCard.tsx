import { clsx } from "clsx";
import { isLive, isLiveMatch } from "../../shared/tournament/tournament";
import type { Match, Tournament } from "../../shared/tournament/types";
import { hapticTarget } from "../services/hapticPlayer";
import { playSound } from "../services/soundPlayer";
import { entrantName } from "../utils/tournamentText";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

interface MatchCardProps {
  tournament: Tournament;
  match: Match;
  myId: number;
  /** Set for live matches: tap to watch. */
  onWatch?: () => void;
}

const CARD_CLASSES = "flex w-full items-center gap-3 rounded-control border-thin border-ink bg-white px-4 py-3 text-left text-ink";

/** One match of the round: both players (with their score in a real-time game), the winner ticked (a quitter marked). A live one has a lip and opens on tap. */
export function MatchCard({ tournament, match, myId, onWatch }: MatchCardProps) {
  const live = isLive(match);
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        {match.players.map((id, seat) => {
          const lost = match.winner !== null && match.winner !== id;
          return (
            <span key={id} className={clsx("flex min-w-0 items-center gap-2", lost && "opacity-disconnected")}>
              <Avatar name={entrantName(tournament, id)} colorIndex={id} small />
              <span className="min-w-0 flex-1 truncate">{entrantName(tournament, id)}</span>
              {id === myId && <Badge tone="ink">YOU</Badge>}
              {/* A real-time match has a score, kept up as it is played. */}
              {isLiveMatch(match) && <span className="flex-none font-display text-label font-black">{match.game.score[seat]}</span>}
              {match.winner === id && <Icon name="check" className="size-6 flex-none text-online" />}
              {lost && match.result === "forfeit" && <Badge tone="white">QUIT</Badge>}
            </span>
          );
        })}
      </span>
      {live && (
        <Badge tone="ink">
          <span className="size-2 animate-live rounded-pill bg-coral" />
          {/* Small phones: just the pulsing dot, so the names have room. */}
          <span className="max-phone:sr-only">LIVE</span>
        </Badge>
      )}
      {match.result === "draw" && <Badge tone="white">DRAW</Badge>}
    </>
  );
  return live && onWatch ? (
    <button
      ref={hapticTarget}
      type="button"
      className={clsx(
        CARD_CLASSES,
        "cursor-pointer shadow-lip-small transition-[translate,box-shadow] duration-fast ease-spring active:translate-y-lip-small active:shadow-pressed",
      )}
      aria-label={`Watch ${match.players.map((id) => entrantName(tournament, id)).join(" against ")}`}
      onClick={() => {
        playSound("cardPress");
        onWatch();
      }}
    >
      {body}
    </button>
  ) : (
    <div className={CARD_CLASSES}>{body}</div>
  );
}
