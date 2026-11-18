import { getGame, type GameId } from "../../../shared/games/catalog";
import { gamePagePath } from "../paths";
import { ArtImage } from "./ArtImage";

/** A game's tile as a link to its page: the same art and name as the room's tiles. */
export function GameLinkCard({ id }: { id: GameId }) {
  return (
    <a
      href={gamePagePath(id)}
      className="flex flex-col items-center gap-1 rounded-card border-outline border-ink bg-white p-2 transition-transform duration-fast ease-spring active:scale-(--transform-press-scale)"
    >
      <span className="block aspect-square w-full">
        <ArtImage id={id} lazy />
      </span>
      <span className="text-center font-display text-caption uppercase">{getGame(id).name}</span>
    </a>
  );
}
