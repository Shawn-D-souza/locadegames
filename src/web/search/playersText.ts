import type { GameInfo } from "../../shared/games/catalog";
import { ROOM_CONFIG } from "../../shared/rooms/config";

/** Who plays a game, in a line ("2 to 4 players round one board"), from the catalog so it never drifts. */
export function playersText(game: GameInfo): string {
  if (game.format === "tournament") return `1 v 1. With 3 to ${ROOM_CONFIG.maxPlayers} in the room, everyone plays a short tournament.`;
  const most = game.maxPlayers ?? ROOM_CONFIG.maxPlayers;
  return game.format === "arena" ? `${game.minPlayers} to ${most} players, all in one arena at once.` : `${game.minPlayers} to ${most} players, all on one board.`;
}
