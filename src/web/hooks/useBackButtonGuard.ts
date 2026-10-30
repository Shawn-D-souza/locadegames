import { useEffect, useRef } from "react";

const GUARD_STATE = { locadeGuard: true } as const;

const onGuardEntry = () => (window.history.state as typeof GUARD_STATE | null)?.locadeGuard === true;

/**
 * While `active`, the browser / phone back button calls `onBack` instead of leaving the page
 * (a mid-match back press is usually a reflex). Works by keeping one extra history entry with
 * the same URL. The entry is left in place afterwards (popping it there changes nothing on
 * screen), so effects running twice in development never fire a fake back press.
 */
export function useBackButtonGuard(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    if (!onGuardEntry()) window.history.pushState(GUARD_STATE, "", window.location.href);
    const handlePop = () => {
      // The press used up our entry; put it back so a second press asks again.
      window.history.pushState(GUARD_STATE, "", window.location.href);
      onBackRef.current();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [active]);
}
