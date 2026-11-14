import { clsx } from "clsx";
import { Icon } from "./Icon";
import { playerStyle } from "../utils/playerStyle";

/** yours: your pick or turn · theirs: someone else's turn · waiting: for the others' picks · win / lose / watch: how the game ended for you. */
export type BannerTone = "yours" | "theirs" | "waiting" | "win" | "lose" | "watch";

interface TurnBannerProps {
  tone: BannerTone;
  /** The player whose color it shows: whose turn, or for your win, you (unused while waiting). */
  playerId: number;
  text: string;
  /** A quieter line under it ("You're out · watching"). */
  detail?: string | null;
  /** Seconds left, shown only near the end (null: not yet). */
  countdown?: number | null;
}

/**
 * Your turn: the banner fills with your color (it pops in each time). Someone else's is quiet: white (the screen around
 * it is in their color); waiting for the others' picks, white too. Flat, no lip (owner direction). Nothing covers the board (owner direction: it gets in the way of the
 * game). The ending stamps in: your win in your color (tilted, with a trophy), your place on white, or (watching) who
 * won on ink.
 */
const TONE_CLASSES: Record<BannerTone, string> = {
  yours: "animate-pop-in bg-player text-player-text",
  theirs: "animate-pop-in bg-white text-ink",
  waiting: "animate-pop-in bg-white text-ink",
  win: "rotate-(--transform-stamp-tilt) animate-stamp bg-player text-player-text shadow-lip-medium",
  lose: "animate-pop-in bg-white text-ink",
  watch: "animate-stamp bg-ink text-white",
};

/** Above the board: whose turn it is, with its last 5 seconds in a bubble, then how the game ended. */
export function TurnBanner({ tone, playerId, text, detail = null, countdown = null }: TurnBannerProps) {
  return (
    <div
      // A new turn or result remounts it, so it pops in.
      key={`${tone}:${text}`}
      className={clsx("flex min-h-tap w-full items-center gap-3 rounded-card border-thin border-ink px-4 py-2", TONE_CLASSES[tone])}
      style={playerStyle(playerId)}
      role="status"
    >
      {tone === "win" && <Icon name="trophy" className="size-(--type-title-size) flex-none fill-waiting text-ink" />}
      <span className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className={clsx("line-clamp-2 font-display font-black wrap-break-word uppercase", tone === "theirs" || tone === "waiting" ? "text-label" : "text-title")}>{text}</span>
        {detail && <span className="text-caption">{detail}</span>}
      </span>
      {countdown !== null && (
        <span
          className="inline-flex size-avatar-small flex-none items-center justify-center rounded-pill border-thin border-ink bg-white font-display font-black text-ink tabular-nums"
          role="timer"
          aria-label={`${countdown} seconds left`}
        >
          {countdown}
        </span>
      )}
    </div>
  );
}
