import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/roboto-mono/500.css";
import "@fontsource/roboto-mono/700.css";
import { App } from "./App";
import "./styles/global.css";

/** Dev-only tool pages (`?preview=celebrations`); the production build drops this branch and its code entirely. */
function devPreview(): ReactNode | null {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "celebrations") {
    const CelebrationPreview = lazy(() => import("./preview/CelebrationPreview").then((m) => ({ default: m.CelebrationPreview })));
    return (
      <Suspense>
        <CelebrationPreview />
      </Suspense>
    );
  }
  return null;
}

createRoot(document.getElementById("root")!).render(<StrictMode>{devPreview() ?? <App />}</StrictMode>);
