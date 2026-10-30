import { clsx } from "clsx";
import type { ReactNode } from "react";

interface BadgeProps {
  /** Ink fill for you (`YOU`) and live things; white for the rest, so badges read on every player color. */
  tone: "ink" | "white";
  className?: string;
  children: ReactNode;
}

/** Small outlined pill: `YOU`, `HOST`, `AWAY`, trophies, `LIVE`, `DRAW`. */
export function Badge({ tone, className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex flex-none items-center gap-1 rounded-pill border-thin border-ink px-2 py-1 text-badge tracking-badge max-phone:px-1",
        tone === "ink" ? "bg-ink text-white" : "bg-white text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
