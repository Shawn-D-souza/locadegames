import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/roboto-mono/500.css";
import "@fontsource/roboto-mono/700.css";
import { App } from "./App";
import { installHaptics } from "./services/hapticPlayer";
import { installSound } from "./services/soundPlayer";
import "./styles/global.css";

/** Dev-only tool pages (`?preview=celebrations`, `?preview=territory`, `?preview=headcrash`, `?preview=haptics`, `?preview=seabattle-sounds`); the production build drops this branch and its code entirely. */
function devPreview(): ReactNode | null {
  if (!import.meta.env.DEV) return null;
  const page = new URLSearchParams(window.location.search).get("preview");
  const Preview =
    page === "celebrations"
      ? lazy(() => import("./preview/CelebrationPreview").then((m) => ({ default: m.CelebrationPreview })))
      : page === "territory"
        ? lazy(() => import("./preview/territory/TerritoryPreview").then((m) => ({ default: m.TerritoryPreview })))
        : page === "headcrash"
          ? lazy(() => import("./preview/headcrash/HeadCrashPreview").then((m) => ({ default: m.HeadCrashPreview })))
          : page === "haptics"
            ? lazy(() => import("./preview/HapticsPreview").then((m) => ({ default: m.HapticsPreview })))
            : page === "seabattle-sounds"
              ? lazy(() => import("./preview/SeaBattleSoundsPreview").then((m) => ({ default: m.SeaBattleSoundsPreview })))
              : null;
  return Preview ? (
    <Suspense>
      <Preview />
    </Suspense>
  ) : null;
}

installSound();
installHaptics();
// Tool pages skip StrictMode: its double effects would double every sound, and they're there to judge those.
createRoot(document.getElementById("root")!).render(devPreview() ?? (<StrictMode><App /></StrictMode>));
