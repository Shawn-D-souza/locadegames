import type { CSSProperties } from "react";
import { CLIENT_CONFIG } from "../config";
import { playerStyle } from "../utils/playerStyle";

/** Spreads values over 0–1 without randomness, so every device shows the same burst. */
const spread = (i: number, salt: number) => ((i + 1) * (0.618034 + salt)) % 1;

interface ConfettiProps {
  /** Player ids whose colors the pieces take, in turn (several for a shared title). */
  colorIds: readonly number[];
  count?: number;
}

/** Champion screen: confetti falling once from the top in the champions' colors, after the champion card. Never blocks taps. */
export function Confetti({ colorIds, count = CLIENT_CONFIG.confettiPieces }: ConfettiProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const style = {
          ...playerStyle(colorIds[i % colorIds.length]!),
          left: `${spread(i, 0) * 100}%`,
          "--drift": spread(i, 0.17) - 0.5,
          "--delay": spread(i, 0.31),
        } as CSSProperties;
        return <span
            key={i}
            className="absolute top-0 h-[calc(var(--layout-confetti)*1.6)] w-confetti animate-confetti rounded-pill border-thin border-ink bg-player opacity-0"
            style={style}
          />;
      })}
    </div>
  );
}
