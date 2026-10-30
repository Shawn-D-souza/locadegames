import { useEffect, useRef, useState } from "react";

/**
 * True from when `key` appears until the local clock reaches `time`, then false (re-renders
 * exactly then). Keyed so small shifts in `time` (clock offset jitter) never restart the wait.
 * Null key: false.
 */
export function useBefore(key: string | null, time: number): boolean {
  const [reached, setReached] = useState<string | null>(null);
  const timeRef = useRef(time);
  useEffect(() => {
    timeRef.current = time;
  });
  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => setReached(key), Math.max(0, timeRef.current - Date.now()));
    return () => clearTimeout(timer);
  }, [key]);
  return key !== null && reached !== key;
}
