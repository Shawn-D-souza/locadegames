import type { GameId } from "../../shared/games/catalog";
import { GAME_COPY } from "./content/gameCopy";

/** Where the pages made for search live. Every address ends in `/`: each page is a folder's `index.html`. */
export const GAMES_INDEX_PATH = "/games/";

export function gamePagePath(id: GameId): string {
  return `${GAMES_INDEX_PATH}${GAME_COPY[id].slug}/`;
}

export function topicPagePath(slug: string): string {
  return `/${slug}/`;
}

/** A game's tile art as an image (`npm run search-art` makes them). */
export function artImagePath(id: GameId): string {
  return `/art/${GAME_COPY[id].slug}.png`;
}
