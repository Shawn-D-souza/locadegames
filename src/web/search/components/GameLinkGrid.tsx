import type { GameId } from "../../../shared/games/catalog";
import { GameLinkCard } from "./GameLinkCard";

/** Game tiles linking to their pages, three across (two on small phones). */
export function GameLinkGrid({ games }: { games: readonly GameId[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 max-phone:grid-cols-2">
      {games.map((id) => (
        <li key={id}>
          <GameLinkCard id={id} />
        </li>
      ))}
    </ul>
  );
}
