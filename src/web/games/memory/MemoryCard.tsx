import { clsx } from "clsx";
import { memo, useState } from "react";
import type { PictureId } from "../../../shared/games/memory/pictures";
import type { MemoryFace } from "../../../shared/games/memory/types";
import { hapticTarget, playHaptic } from "../../services/hapticPlayer";
import { CardSide, type CardFinder } from "./CardSide";

/** What just happened to a card: it's turning (yours, waiting for the server), its pair was found, or it was a miss. */
export type CardMoment = "turning" | "pair" | "miss" | null;

interface MemoryCardProps {
  /** Its number (0-based), handed back on a tap. */
  card: number;
  /**
   * Its face while it shows one (found, face up this turn, or a miss still showing): its picture (null face down) and
   * color, as plain values, so a card isn't redrawn by every server message (each brings new objects).
   */
  picture: PictureId | null;
  color: number;
  /** Who found its pair, or null while in play. */
  finderId: number | null;
  /** That finder quit: their pair shows grey. */
  finderQuit: boolean;
  moment: CardMoment;
  /** Your turn and it can be turned: it takes taps. */
  enabled: boolean;
  /** Its name for screen readers ("Card 3: red star"). */
  label: string;
  onTurn(card: number): void;
}

/** The side a card shows, and the turn that brought it there. */
interface Turn {
  face: MemoryFace | null;
  /** The side it turned from (shown for the first half of the turn); undefined as the game starts (no turn plays). */
  from: MemoryFace | null | undefined;
  /** It was already squeezed thin (your tap, waiting for the server): only the second half plays. */
  half: boolean;
  /** Counts turns, so each plays as a fresh animation. */
  id: number;
  turning: boolean;
}

/** The same side: both backs, or the same picture in the same color. */
const sameSide = (a: MemoryFace | null, b: MemoryFace | null) => a === b || (a !== null && b !== null && a.picture === b.picture && a.color === b.color);

/**
 * One card (flat: owner decision, a lip that came and went looked glitchy). Turning over is a whole half turn seen side
 * on: the side it shows squeezes thin, then the other side opens out, on every phone. Your own card starts squeezing
 * the moment you tap, and opens out when the server has said what it is. Memoized: the screen redraws ten times a
 * second for its clock, and a card redraws only when something on it changes.
 */
export const MemoryCard = memo(function MemoryCard({ card, picture, color, finderId, finderQuit, moment, enabled, label, onTurn }: MemoryCardProps) {
  const turning = moment === "turning";
  const face: MemoryFace | null = picture === null ? null : { picture, color };
  const [turn, setTurn] = useState<Turn>({ face, from: undefined, half: false, id: 0, turning });
  if (!sameSide(turn.face, face)) {
    setTurn({ face, from: turn.face, half: turn.turning, id: turn.id + 1, turning });
  } else if (turn.turning !== turning) {
    setTurn({ ...turn, turning });
  }
  const finder: CardFinder | null = finderId === null ? null : { id: finderId, quit: finderQuit };
  const whole = turn.from !== undefined && !turn.half;
  return (
    <button
      ref={hapticTarget}
      type="button"
      className={clsx(
        "relative aspect-square rounded-memory-card outline-none",
        enabled && "cursor-pointer",
        moment === "pair" && "animate-card-pair",
        moment === "miss" && "animate-card-miss",
      )}
      disabled={!enabled}
      aria-label={label}
      onClick={() => {
        // Felt the moment the finger lands; its sound waits until the server has said what the card is.
        playHaptic("memoryTap");
        onTurn(card);
      }}
    >
      <span
        key={turn.id}
        className={clsx("absolute inset-0", turning ? "animate-card-lift" : turn.from === undefined ? null : turn.half ? "animate-card-open" : "animate-card-flip")}
      >
        {whole && <CardSide face={turn.from!} finder={null} className="animate-card-side-out" />}
        <CardSide face={turn.face} finder={finder} className={whole ? "animate-card-side-in" : undefined} />
      </span>
    </button>
  );
});
