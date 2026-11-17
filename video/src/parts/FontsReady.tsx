import { useEffect, useState, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";

/** Holds the frame until the app's fonts have loaded, so no frame is drawn in a fallback font. */
export function FontsReady({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    void document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);
  return <>{children}</>;
}
