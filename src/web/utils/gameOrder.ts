import type { GameInfo } from "../../shared/games/catalog";

/** Whether a room with this many players online can start the game: too few, too many, or it fits. */
export function gameFit(game: GameInfo, online: number): "tooFew" | "tooMany" | "fits" {
  if (online < game.minPlayers) return "tooFew";
  if (game.maxPlayers !== undefined && online > game.maxPlayers) return "tooMany";
  return "fits";
}

/**
 * The room's game grid, in three groups that keep the catalog's order within them: games everyone plays
 * together first, then 1v1 games once they'd be a tournament (3+ players), then games the room can't start.
 */
export function orderGames<G extends GameInfo>(games: readonly G[], online: number): G[] {
  const group = (game: G) => (gameFit(game, online) !== "fits" ? 2 : game.format === "tournament" && online > 2 ? 1 : 0);
  return games.map((game, index) => ({ game, index, group: group(game) })).sort((a, b) => a.group - b.group || a.index - b.index).map(({ game }) => game);
}
