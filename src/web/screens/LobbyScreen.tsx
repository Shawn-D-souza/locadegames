import { GAMES, type GameId } from "../../shared/games/catalog";
import type { ClientMessage, RoomView } from "../../shared/protocol/messages";
import type { PlayerId } from "../../shared/rooms/types";
import { GameTile } from "../components/GameTile";
import { Header } from "../components/Header";
import { PlayerBar } from "../components/PlayerBar";
import { RoomCodePanel } from "../components/RoomCodePanel";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { GAME_LOOKS } from "../games/gameLooks";

interface LobbyScreenProps {
  room: RoomView;
  myId: PlayerId;
  send(message: ClientMessage): void;
  onLeave(): void;
}

/** The room hub: code to share, who's here, and the game grid (host taps to start, others to suggest). */
export function LobbyScreen({ room, myId, send, onLeave }: LobbyScreenProps) {
  const isHost = room.hostId === myId;
  const me = room.players.find((p) => p.id === myId);
  const online = room.players.filter((p) => p.connected).length;

  const pick = (gameId: GameId) => {
    if (isHost) send({ type: "start", gameId });
    else send({ type: "suggest", gameId: me?.suggestion === gameId ? null : gameId });
  };

  const hint =
    room.players.length < 2
      ? "Waiting for friends... share the code!"
      : isHost
        ? "Tap a game to start it. Friends can suggest one."
        : "Tap a game to suggest it. The host starts it.";

  return (
    <ScreenLayout header={<Header title="Locade Games" onBack={onLeave} backLabel="Leave room" />}>
      <SectionCard label="Room">
        <RoomCodePanel code={room.code} />
      </SectionCard>

      <SectionCard label={`Players (${room.players.length})`}>
        <ul className="flex w-full flex-col gap-3">
          {room.players.map((player) => (
            <PlayerBar key={player.id} player={player} isYou={player.id === myId} isHost={player.id === room.hostId} />
          ))}
        </ul>
      </SectionCard>

      <SectionCard label="Games">
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(var(--layout-game-tile),40%),1fr))] gap-4">
          {GAMES.map((game) => {
            const tooFew = online < game.minPlayers;
            return (
              <GameTile
                key={game.id}
                game={game}
                look={GAME_LOOKS[game.id]}
                disabled={isHost && tooFew}
                needs={tooFew ? `NEEDS ${game.minPlayers}+` : undefined}
                // Your own vote first, so it always shows before "+n".
                suggesters={room.players.filter((p) => p.suggestion === game.id).sort((a, b) => Number(b.id === myId) - Number(a.id === myId))}
                selected={me?.suggestion === game.id}
                onPick={() => pick(game.id)}
              />
            );
          })}
        </div>
        <p className="text-center text-caption">{hint}</p>
      </SectionCard>
    </ScreenLayout>
  );
}
