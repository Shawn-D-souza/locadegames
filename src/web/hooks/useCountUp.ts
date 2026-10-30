import { useEffect, useState } from "react";

/** Counts from 0 up to `target`, one step at a time, starting after `delayMs` and taking `durationMs` in all. */
export function useCountUp(target: number, delayMs: number, durationMs: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled || target <= 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let step = 1; step <= target; step++) {
      timers.push(setTimeout(() => setValue(step), delayMs + (durationMs * step) / target));
    }
    return () => timers.forEach(clearTimeout);
  }, [target, delayMs, durationMs, enabled]);
  return enabled ? value : target;
}
