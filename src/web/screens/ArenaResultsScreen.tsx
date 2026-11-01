import type { Arena } from "../../shared/arena/types";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { ArenaRankingTable } from "../components/ArenaRankingTable";
import { ChampionCard } from "../components/ChampionCard";
import { Confetti } from "../components/Confetti";
import { Header } from "../components/Header";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { arenaName } from "../utils/arenaText";

interface ArenaResultsScreenProps {
  room: RoomView;
  arena: Arena;
  myId: PlayerId;
  send(message: ClientMessage): void;
  /** A player's back arrow: just you back to the room. */
  onBack(): void;
}

/** Results of a real-time match: the champion card and the final ranking; the host plays again or takes everyone back. */
export function ArenaResultsScreen({ room, arena, myId, send, onBack }: ArenaResultsScreenProps) {
  const isHost = room.hostId === myId;
  const backToRoom = () => send({ type: "backToRoom" });

  const footer = isHost ? (
    <div className="flex w-full flex-col gap-4">
      <PillButton fullWidth onClick={() => send({ type: "start", gameId: arena.gameId })}>
        PLAY AGAIN!
      </PillButton>
      <PillButton fullWidth variant="deep" onClick={backToRoom}>
        BACK TO ROOM
      </PillButton>
    </div>
  ) : undefined;

  return (
    <ScreenLayout header={<Header title="Results" onBack={isHost ? backToRoom : onBack} backLabel="Back to room" />} footer={footer}>
      <Confetti colorIds={arena.championIds} />
      <ChampionCard
        championIds={arena.championIds}
        nameOf={(id) => arenaName(arena, id)}
        twoPlayers={arena.entrants.length === 2}
        myId={myId}
      />
      <SectionCard label="Ranking">
        <ArenaRankingTable arena={arena} myId={myId} />
        {!isHost && <p className="text-center text-caption">Waiting for the host to pick the next game.</p>}
      </SectionCard>
    </ScreenLayout>
  );
}
