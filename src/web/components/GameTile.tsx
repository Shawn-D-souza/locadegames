import { clsx } from "clsx";
import type { GameInfo } from "../../shared/games/catalog";
import { CLIENT_CONFIG } from "../config";
import type { GameLook } from "../games/gameLooks";
import { hapticTarget } from "../services/hapticPlayer";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

interface GameTileProps {
  game: GameInfo;
  look: GameLook;
  disabled: boolean;
  /** What's missing to play it ("NEEDS 2+"), shown as a tab on the top edge. */
  needs?: string;
  /** Players who suggested this game. */
  suggesters?: readonly { id: number; name: string }[];
  /** The local player suggested it. */
  selected?: boolean;
  onPick(): void;
}

/**
 * Square white tile, always the same size: the game's art in a thin frame with its name under it. Votes sit on the
 * top-right corner (a few avatars, then "+n"), so voting never moves anything.
 */
export function GameTile({ game, look, disabled, needs, suggesters = [], selected, onPick }: GameTileProps) {
  const shown = suggesters.slice(0, CLIENT_CONFIG.tileVotersShown);
  const more = suggesters.length - shown.length;
  return (
    <button
      ref={hapticTarget}
      type="button"
      className={clsx(
        "relative flex aspect-square w-full cursor-pointer flex-col items-center gap-1 rounded-card border-outline bg-white p-2 disabled:cursor-not-allowed disabled:opacity-disabled",
        "shadow-lip-small transition-[translate,box-shadow] duration-fast ease-spring enabled:active:translate-y-lip-small enabled:active:shadow-pressed",
        // Coral marks the game you suggested.
        selected ? "border-coral" : "border-ink",
      )}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onPick}
    >
      <span className="flex min-h-0 w-full flex-1 justify-center">
        <span className="block aspect-square h-full">
          <look.Art />
        </span>
      </span>
      <span className="max-w-full truncate font-display text-caption uppercase">{game.name}</span>
      {needs && (
        <Badge tone="white" className="absolute top-0 left-1/2 -translate-1/2 whitespace-nowrap">
          {needs}
        </Badge>
      )}
      {suggesters.length > 0 && (
        <span
          className="absolute -top-2 -right-2 flex items-center *:not-first:-ml-2"
          aria-label={`Suggested by ${suggesters.map((p) => p.name).join(", ")}`}
        >
          {shown.map((p) => (
            <Avatar key={p.id} name={p.name} colorIndex={p.id} small />
          ))}
          {more > 0 && <Badge tone="ink">+{more}</Badge>}
        </span>
      )}
    </button>
  );
}
