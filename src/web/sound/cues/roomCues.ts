import type { PlayerView, RoomView } from "../../../shared/protocol/messages";
import type { PlayerId } from "../../../shared/rooms/types";
import type { SoundName } from "../soundBook";

export interface RoomCue {
  sound: SoundName;
  variant?: number;
}

const gameStamp = (room: RoomView) => room.tournament?.startedAt ?? room.arena?.startedAt ?? null;

const byId = (players: readonly PlayerView[]) => new Map(players.map((p) => [p.id, p]));

/**
 * What's worth hearing in a room update, from your point of view: pure, so it can be tested. Comings and
 * goings are only heard between games: during play the game has the stage.
 */
export function roomChangeCues(before: RoomView | null, after: RoomView, myId: PlayerId): RoomCue[] {
  if (!before) return [{ sound: "roomEntered" }];
  const cues: RoomCue[] = [];
  const stamp = gameStamp(after);
  if (after.phase === "playing" && stamp !== null && stamp !== gameStamp(before)) cues.push({ sound: "gameStarting" });
  if (after.hostId === myId && before.hostId !== myId) cues.push({ sound: "youBecameHost" });
  if (after.phase === "playing") return cues;

  const was = byId(before.players);
  const now = byId(after.players);
  for (const player of after.players) {
    if (player.id === myId) continue;
    const old = was.get(player.id);
    if (!old) {
      cues.push({ sound: "playerJoined", variant: player.id });
      continue;
    }
    if (old.connected && !player.connected) cues.push({ sound: "playerWentAway" });
    if (!old.connected && player.connected) cues.push({ sound: "playerCameBack" });
    if (player.suggestion !== null && player.suggestion !== old.suggestion) cues.push({ sound: "friendSuggestedGame", variant: player.id });
  }
  for (const player of before.players) {
    if (player.id !== myId && !now.has(player.id)) cues.push({ sound: "playerLeft", variant: player.id });
  }
  return cues;
}

export const COUNTDOWN_TAKES = 3;
