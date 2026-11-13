import { useSyncExternalStore } from "react";

const QUERY = "(orientation: landscape)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/** The screen is wider than tall (the same test as the `landscape:` classes), kept up to date as it turns. */
export function useLandscape(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches);
}
