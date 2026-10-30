import type { CSSProperties } from "react";

const DOT_COUNT = 3;

/** Three ink dots hopping one after the other: still working on it. */
export function LoadingDots() {
  return (
    <span className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <span key={i} className="size-3 animate-dot rounded-pill bg-ink" style={{ "--order": i } as CSSProperties} />
      ))}
    </span>
  );
}
