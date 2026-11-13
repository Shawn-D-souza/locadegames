import type { RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, standings } from "../../shared/tournament/tournament";
import type { Tournament } from "../../shared/tournament/types";
import { TOURNAMENT_CONFIG } from "../../shared/tournament/config";
import { Badge } from "../components/Badge";
import { ScreenLayout } from "../components/ScreenLayout";
import { SeatCard } from "../components/SeatCard";
import { SectionCard } from "../components/SectionCard";
import { StandingsTable } from "../components/StandingsTable";
import { CLIENT_CONFIG } from "../config";
import { useCountdownSounds } from "../hooks/useCountdownSounds";
import { useNow } from "../hooks/useNow";
import { entrantName, roundLabel } from "../utils/tournamentText";

interface RoundIntroScreenProps {
  room: RoomView;
  tournament: Tournament;
  myId: PlayerId;
  /** Local time the round's matches all begin. */
  startsAt: number;
  /** A real-time game: it counts its own 3, 2, 1 in the arena (here it only says to get ready). */
  live: boolean;
  /** The game's players have X / O pieces; otherwise (a real-time game, Sea Battle) the cards show avatars. */
  pieces: boolean;
}

/** The break between rounds: round title, who you play (or that you sit out), a countdown to the shared start (or GET READY! before a real-time game's own countdown), and the points. */
export function RoundIntroScreen({ room, tournament, myId, startsAt, live, pieces }: RoundIntroScreenProps) {
  const now = useNow(CLIENT_CONFIG.timerTickMs);
  const seconds = Math.max(1, Math.ceil((startsAt - now) / 1000));
  useCountdownSounds(live ? 0 : seconds);
  const round = currentRound(tournament);
  const mine = round.matches.find((m) => m.players.includes(myId));

  const card = (id: PlayerId, seat: 0 | 1) => (
    <SeatCard
      player={{ id, name: entrantName(tournament, id), connected: room.players.find((p) => p.id === id)?.connected ?? false }}
      seat={pieces ? seat : undefined}
      isYou={id === myId}
      active={false}
    />
  );

  return (
    <ScreenLayout centered>
      <div className="flex w-full max-w-board flex-col items-stretch gap-6">
        <h1 className="text-center font-display text-title font-black uppercase">{roundLabel(tournament)}</h1>
        {mine ? (
          <div className="relative grid grid-cols-2 gap-3">
            {/* You on the left, as on the match screen. */}
            {mine.players[0] === myId ? card(mine.players[0], 0) : card(mine.players[1], 1)}
            {mine.players[0] === myId ? card(mine.players[1], 1) : card(mine.players[0], 0)}
            <Badge tone="ink" className="absolute top-1/2 left-1/2 -translate-1/2">
              VS
            </Badge>
          </div>
        ) : (
          // In a white box, so it reads well over the dots.
          <p className="flex flex-col items-center gap-1 rounded-control border-thin border-ink bg-white px-4 py-3 text-center">
            {round.bye === myId ? "You sit this round out" : "Next round is starting."}
            {round.bye === myId && <span className="text-caption text-ink-soft">+{TOURNAMENT_CONFIG.byePoints} points</span>}
          </p>
        )}
        {live ? (
          <p className="text-center font-display text-display font-black text-waiting uppercase text-lip-ink" role="status">
            Get ready!
          </p>
        ) : (
          // Keyed by the second, so each new number pops.
          <p
            key={seconds}
            className="animate-tick text-center font-display text-numeral text-waiting text-lip-ink"
            role="timer"
            aria-label={`Starts in ${seconds} seconds`}
          >
            {seconds}
          </p>
        )}
        <SectionCard label="Points">
          <StandingsTable standings={standings(tournament)} myId={myId} />
        </SectionCard>
      </div>
    </ScreenLayout>
  );
}
