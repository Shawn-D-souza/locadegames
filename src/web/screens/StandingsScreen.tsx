import type { PlayerId } from "../../shared/rooms/types";
import { currentRound, isLive, standings } from "../../shared/tournament/tournament";
import type { Tournament } from "../../shared/tournament/types";
import { ByeCard } from "../components/ByeCard";
import { Header } from "../components/Header";
import { MatchCard } from "../components/MatchCard";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { StandingsTable } from "../components/StandingsTable";
import { entrantName, roundLabel } from "../utils/tournamentText";

interface StandingsScreenProps {
  tournament: Tournament;
  myId: PlayerId;
  onWatch(matchId: number): void;
  onLeave(): void;
}

/** Why you're here, plus what you can do: under the round's matches. */
function hint(t: Tournament, myId: PlayerId, anyLive: boolean): string {
  const watch = anyLive ? " Tap a match to watch." : "";
  if (!t.entrants.some((e) => e.id === myId)) return `You'll play in the next game.${watch}`;
  if (t.left.includes(myId)) return `You quit this one.${watch}`;
  return anyLive ? "Tap a match to watch." : "Waiting for the other matches...";
}

/** Between your matches: the points table, then this round's matches (live ones open on tap) and who sits out. */
export function StandingsScreen({ tournament, myId, onWatch, onLeave }: StandingsScreenProps) {
  const round = currentRound(tournament);
  const anyLive = round.matches.some(isLive);
  return (
    <ScreenLayout header={<Header title={roundLabel(tournament)} onBack={onLeave} backLabel="Leave room" />}>
      <SectionCard label="Points">
        <StandingsTable standings={standings(tournament)} myId={myId} />
      </SectionCard>
      <SectionCard label={anyLive ? "Playing now" : "This round"}>
        {round.matches.map((match) => (
          <MatchCard key={match.id} tournament={tournament} match={match} myId={myId} onWatch={() => onWatch(match.id)} />
        ))}
        {round.bye !== null && <ByeCard player={{ id: round.bye, name: entrantName(tournament, round.bye) }} isYou={round.bye === myId} />}
        <p className="text-center text-caption">{hint(tournament, myId, anyLive)}</p>
      </SectionCard>
    </ScreenLayout>
  );
}
