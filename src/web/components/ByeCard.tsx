import { TOURNAMENT_CONFIG } from "../../shared/tournament/config";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

interface ByeCardProps {
  player: { id: number; name: string };
  isYou: boolean;
}

/** The player sitting this round out, under the round's matches: a dashed card (nothing to play) with the free points. */
export function ByeCard({ player, isYou }: ByeCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-control border-thin border-dashed border-ink-soft px-4 py-3 text-ink">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={player.name} colorIndex={player.id} small />
        <span className="min-w-0 flex-1 truncate">{player.name}</span>
        {isYou && <Badge tone="ink">YOU</Badge>}
      </span>
      <span className="text-caption text-ink-soft">Sits out · +{TOURNAMENT_CONFIG.byePoints} points</span>
    </div>
  );
}
