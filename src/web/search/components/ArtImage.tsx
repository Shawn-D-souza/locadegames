import type { GameId } from "../../../shared/games/catalog";
import { layout } from "../../../theme";
import { artImagePath } from "../paths";

/** A game's tile art, photographed (`npm run search-art`): a plain image, so the pages need no JavaScript. Empty `alt` where its name is written beside it. */
export function ArtImage({ id, alt = "", lazy = false }: { id: GameId; alt?: string; lazy?: boolean }) {
  return (
    <img
      src={artImagePath(id)}
      alt={alt}
      width={layout.artImage}
      height={layout.artImage}
      loading={lazy ? "lazy" : "eager"}
      className="block aspect-square size-full"
    />
  );
}
