import { clsx } from "clsx";
import { splitShare } from "../utils/arenaText";

interface ShareNumberProps {
  share: number;
  /** `small` in a real-time game's land table; `large` on the results. */
  size: "small" | "large";
}

/** A land share in the games' number font, its decimals smaller: a big "7" and a small ".36%". */
export function ShareNumber({ share, size }: ShareNumberProps) {
  const [whole, rest] = splitShare(share);
  return (
    <span className="flex-none font-display font-black whitespace-nowrap tabular-nums">
      <span className={size === "large" ? "text-title" : "text-label"}>{whole}</span>
      <span className={clsx(size === "large" ? "text-label" : "text-caption")}>{rest}</span>
    </span>
  );
}
