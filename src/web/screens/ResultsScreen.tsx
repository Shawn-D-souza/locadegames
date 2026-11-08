import type { ReactNode } from "react";
import type { GameId } from "../../shared/games/catalog";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { ChampionCard } from "../components/ChampionCard";
import { Confetti } from "../components/Confetti";
import { Header } from "../components/Header";
import { PillButton } from "../components/PillButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { WaitingForHost } from "../components/WaitingForHost";
import { useChampionSounds } from "../hooks/useChampionSounds";

interface ResultsScreenProps {
  room: RoomView;
  myId: PlayerId;
  send(message: ClientMessage): void;
  /** A player's back arrow: just you back to the room (the others stay until they go back or the host picks). */
  onBack(): void;
  /** The game that finished (PLAY AGAIN starts it again), its champions, how many played (2: a shared title is a draw) and their names. */
  gameId: GameId;
  championIds: PlayerId[];
  playerCount: number;
  nameOf(id: PlayerId): string;
  /** The final table and its label: the only part that differs by format (a tournament's `Points`, an arena game's `Ranking`). */
  tableLabel: string;
  children: ReactNode;
}

/**
 * Results of every game: the champion card, the final table, confetti and the champion's sounds; the host
 * plays again or takes everyone back to the room, everyone else waits (their back arrow takes only them).
 */
export function ResultsScreen({ room, myId, send, onBack, gameId, championIds, playerCount, nameOf, tableLabel, children }: ResultsScreenProps) {
  const isHost = room.hostId === myId;
  const backToRoom = () => send({ type: "backToRoom" });
  useChampionSounds(championIds, myId);

  const footer = isHost ? (
    <div className="flex w-full flex-col gap-4">
      <PillButton fullWidth onClick={() => send({ type: "start", gameId })}>
        PLAY AGAIN!
      </PillButton>
      <PillButton fullWidth variant="deep" onClick={backToRoom}>
        BACK TO ROOM
      </PillButton>
    </div>
  ) : undefined;

  return (
    <ScreenLayout header={<Header title="Results" onBack={isHost ? backToRoom : onBack} backLabel="Back to room" />} footer={footer}>
      <Confetti colorIds={championIds} />
      <ChampionCard championIds={championIds} nameOf={nameOf} twoPlayers={playerCount === 2} myId={myId} />
      <SectionCard label={tableLabel}>{children}</SectionCard>
      {!isHost && <WaitingForHost />}
    </ScreenLayout>
  );
}
