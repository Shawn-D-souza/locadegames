import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { standings } from "../../shared/tournament/tournament";
import type { Tournament } from "../../shared/tournament/types";
import { ChampionCard } from "../components/ChampionCard";
import { Confetti } from "../components/Confetti";
import { Header } from "../components/Header";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { StandingsTable } from "../components/StandingsTable";

interface ChampionScreenProps {
  room: RoomView;
  tournament: Tournament;
  myId: PlayerId;
  send(message: ClientMessage): void;
  /** A player's back arrow: just you back to the room (the others stay until they go back or the host picks). */
  onBack(): void;
}

/** Results: the champion card and the final points; the host plays again or takes everyone back to the room. */
export function ChampionScreen({ room, tournament, myId, send, onBack }: ChampionScreenProps) {
  const isHost = room.hostId === myId;
  const backToRoom = () => send({ type: "backToRoom" });

  const footer = isHost ? (
    <div className="flex w-full flex-col gap-4">
      <PillButton fullWidth onClick={() => send({ type: "start", gameId: tournament.gameId })}>
        PLAY AGAIN!
      </PillButton>
      <PillButton fullWidth variant="deep" onClick={backToRoom}>
        BACK TO ROOM
      </PillButton>
    </div>
  ) : undefined;

  return (
    <ScreenLayout header={<Header title="Results" onBack={isHost ? backToRoom : onBack} backLabel="Back to room" />} footer={footer}>
      <Confetti colorIds={tournament.championIds} />
      <ChampionCard tournament={tournament} myId={myId} />
      <SectionCard label="Points">
        <StandingsTable standings={standings(tournament)} myId={myId} />
        {!isHost && <p className="text-center text-caption">Waiting for the host to pick the next game.</p>}
      </SectionCard>
    </ScreenLayout>
  );
}
