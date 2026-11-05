import { clsx } from "clsx";
import { useEffect } from "react";
import { durations } from "../../theme";
import { useCountUp } from "../hooks/useCountUp";
import { playSound } from "../services/soundPlayer";
import { POINTS_WAIT_MS, pointsTickTake } from "../sound/cues/endingCues";
import { Icon } from "./Icon";

/** win: your win (stamps in, tilted, trophy) · lose: quiet · draw / watch: neutral. */
export type ResultTone = "win" | "lose" | "draw" | "watch";

interface ResultTagProps {
  tone: ResultTone;
  label: string;
  /** Tournament points this result earned you; null hides them. */
  points: number | null;
  /** Why it ended, when unusual ("Ana quit"). */
  detail: string | null;
  /** Points tick up from 0 once the tag has landed and its sound has played (`landsAtMs` from when the match ended), each tick popping. */
  countUp?: boolean;
  landsAtMs?: number;
  /** How the number reads (tournament points: `+2`; a land share: `34%`). */
  format?: (value: number) => string;
}

const asPoints = (value: number) => `+${value}`;

/**
 * Your win: in your color with an ink lip, slightly tilted like a stamp. Your loss: a quiet white pill that slides up.
 * A draw needs no win line, so it comes in with the board's shake.
 */
const TONE_CLASSES: Record<ResultTone, string> = {
  win: "animate-stamp rotate-(--transform-stamp-tilt) bg-player text-player-text shadow-lip-medium",
  lose: "animate-slide-up bg-white text-ink",
  draw: "animate-stamp-draw bg-ink text-white",
  watch: "animate-stamp bg-ink text-white",
};

/** How a match ended, on a pill that sits on the board's bottom edge, so nothing on the screen moves. */
export function ResultTag({ tone, label, points, detail, countUp = false, landsAtMs = 0, format = asPoints }: ResultTagProps) {
  const shown = useCountUp(points ?? 0, landsAtMs + POINTS_WAIT_MS[tone], durations.countUp, countUp && points !== null);
  // Each tick climbs the scale; a fast count (a land share) just rolls, the sound's cooldown thins it out.
  useEffect(() => {
    if (countUp && points !== null && shown > 0) playSound("pointsTick", { variant: pointsTickTake(shown, points) });
  }, [shown, points, countUp]);
  return (
    // Straddles the board's bottom edge like the section labels sit on their cards.
    <div
      className={clsx(
        "absolute bottom-0 left-1/2 flex max-w-[calc(100%-var(--space-8))] -translate-x-1/2 translate-y-1/2 items-center gap-3",
        "rounded-pill border-thin border-ink px-6 py-2 whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
      role="status"
    >
      {tone === "win" && <Icon name="trophy" className="size-(--type-title-size) flex-none fill-waiting text-ink" />}
      <span className="flex min-w-0 flex-col items-center">
        <span className="font-display text-title font-black uppercase">{label}</span>
        {detail && <span className="text-caption">{detail}</span>}
      </span>
      {points !== null && (
        <span
          key={shown}
          className={clsx(
            "flex-none rounded-pill px-2 py-1 font-display font-black",
            tone === "lose" ? "bg-background text-ink-muted" : "bg-white text-ink",
            countUp && "animate-tick",
          )}
        >
          {format(shown)}
        </span>
      )}
    </div>
  );
}
