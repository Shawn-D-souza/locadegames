import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { MEMORY_CONFIG } from "../../../shared/games/memory/config";
import type { MemoryFace } from "../../../shared/games/memory/types";
import { MemoryCard, type CardMoment } from "./MemoryCard";

export interface CardShown {
  face: MemoryFace | null;
  /** The face's name, for screen readers: "red knight". */
  name: string | null;
  /** Who found its pair (a player id), or null while in play. */
  finderId: number | null;
  /** That finder quit: their pair shows grey. */
  finderQuit: boolean;
  moment: CardMoment;
  enabled: boolean;
}

interface MemoryBoardProps {
  cols: number;
  cards: readonly CardShown[];
  /** The game just ended: the board thumps. */
  ended: boolean;
  onTurn(card: number): void;
}

/**
 * The cards in a grid, `cols` across, the same way round on every screen (owner decision: players point at cards
 * across the room, so every phone shows the same arrangement, held upright or sideways).
 */
export function MemoryBoard({ cols, cards, ended, onTurn }: MemoryBoardProps) {
  return (
    <div
      className={clsx("grid w-full grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2 max-phone:gap-1", ended && "animate-board-thump")}
      style={{ "--cols": cols, "--flip-ms": `${MEMORY_CONFIG.flipMs}ms` } as CSSProperties}
      role="group"
      aria-label="Cards"
    >
      {cards.map((card, i) => (
        <MemoryCard
          key={i}
          card={i}
          picture={card.face?.picture ?? null}
          color={card.face?.color ?? 0}
          finderId={card.finderId}
          finderQuit={card.finderQuit}
          moment={card.moment}
          enabled={card.enabled}
          label={`Card ${i + 1}${card.name ? `: ${card.name}` : ""}${card.finderId === null ? "" : ", found"}`}
          onTurn={onTurn}
        />
      ))}
    </div>
  );
}
