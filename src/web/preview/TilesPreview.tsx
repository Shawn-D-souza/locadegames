import { GAMES } from "../../shared/games/catalog";
import { GAME_LOOKS } from "../games/gameLooks";

/**
 * Dev-only page (`?preview=tiles`): every game's tile art alone at one size, on white, as `npm run search-art`
 * photographs it for the pages made for search (some art is drawn on a canvas, which those plain pages can't run).
 */
export function TilesPreview() {
  return (
    <main className="flex flex-wrap gap-4 p-gutter">
      {GAMES.map((game) => {
        const { Art } = GAME_LOOKS[game.id];
        return (
          <div key={game.id} data-tile={game.id} className="size-art-image bg-white">
            <Art />
          </div>
        );
      })}
    </main>
  );
}
