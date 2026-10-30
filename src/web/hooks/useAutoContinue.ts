import { useEffect, useRef } from "react";

/** Calls `onContinue` once, `delayMs` after `active` turns on (a finished match moves on by itself). */
export function useAutoContinue(active: boolean, delayMs: number, onContinue: (() => void) | undefined) {
  // Kept in a ref: the screen re-renders on every room update, which must not restart the wait.
  const callback = useRef(onContinue);
  useEffect(() => {
    callback.current = onContinue;
  });

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => callback.current?.(), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);
}
