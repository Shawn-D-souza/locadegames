import type { Arena } from "../../../../shared/arena/types";
import type { PlayerId } from "../../../../shared/rooms/types";
import { arenaName } from "../../../utils/arenaText";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { KnockoutView } from "../engine/frame";

interface KnockoutFeedProps {
  knockouts: readonly KnockoutView[];
  arena: Arena;
  myId: PlayerId;
}

/** "Ana cut Ben", "You took Ben's land", "Ben quit": what just happened, from whoever's point of view. */
export function knockoutText(k: KnockoutView, arena: Arena, myId: PlayerId): string {
  const who = (id: PlayerId) => (id === myId ? "You" : arenaName(arena, id));
  const whom = (id: PlayerId) => (id === myId ? "you" : arenaName(arena, id));
  if (k.reason === "quit") return `${who(k.id)} quit`;
  if (k.by === null) return k.id === myId ? "Your land is gone" : `${arenaName(arena, k.id)}'s land is gone`;
  return k.reason === "cut" ? `${who(k.by)} cut ${whom(k.id)}` : `${who(k.by)} took ${k.id === myId ? "your" : `${arenaName(arena, k.id)}'s`} land`;
}

/** Recent knockouts under the clock, newest last; each pops in and goes after a few seconds. Your own going out has its own card. */
export function KnockoutFeed({ knockouts, arena, myId }: KnockoutFeedProps) {
  const rows = knockouts.filter((k) => k.id !== myId).slice(-TERRITORY_CLIENT_CONFIG.hud.knockoutRows);
  if (!rows.length) return null;
  return (
    <ol className="flex w-hud-feed flex-col items-start gap-1" aria-live="polite">
      {rows.map((k) => (
        <li key={`${k.id}:${k.at}`} className="animate-pop-in rounded-control border-thin border-ink bg-white px-2 py-1 text-caption text-ink">
          {knockoutText(k, arena, myId)}
        </li>
      ))}
    </ol>
  );
}
