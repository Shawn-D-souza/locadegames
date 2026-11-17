import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../look";
import { useFrameAnimations } from "./useFrameAnimations";

/** A phone's status bar height in CSS pixels (an iPhone 14): the time, signal and battery round the camera. */
export const STATUS_BAR = 47;

function StatusBar() {
  return (
    <div style={{ position: "absolute", inset: `0 0 auto 0`, height: STATUS_BAR, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 30px 0 34px", fontFamily: fonts.body, fontWeight: 700, fontSize: 16, color: colors.ink, zIndex: 10 }}>
      <span>3:17</span>
      <svg width="70" height="14" viewBox="0 0 70 14" aria-hidden="true">
        {[0, 1, 2, 3].map((k) => <rect key={k} x={k * 5} y={10 - k * 3} width="3.4" height={4 + k * 3} rx="1" fill={colors.ink} />)}
        <path d="M27 5.2a8.5 8.5 0 0 1 12 0M29.4 7.8a5 5 0 0 1 7.2 0M32 10.5a1.4 1.4 0 0 1 2 0" stroke={colors.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="44" y="1.5" width="22" height="11" rx="3.5" stroke={colors.ink} strokeWidth="1.5" fill="none" />
        <rect x="46" y="3.5" width="16" height="7" rx="2" fill={colors.ink} />
        <rect x="67.2" y="5" width="1.8" height="4" rx="0.9" fill={colors.ink} />
      </svg>
    </div>
  );
}

/**
 * A screen of the app at its own size: the body's dotted page and type, as in the browser. On a phone the status bar
 * sits on top and the app below it, as the browser shows it on a real phone.
 */
export function AppScreen({ children, statusBar = false }: { children: ReactNode; statusBar?: boolean }) {
  useFrameAnimations();
  const top = statusBar ? STATUS_BAR : 0;
  return (
    <AbsoluteFill
      className="overflow-hidden"
      style={{
        backgroundColor: colors.background,
        backgroundImage: `radial-gradient(circle, ${colors.ink} var(--layout-dot-radius), transparent var(--layout-dot-radius))`,
        backgroundSize: "var(--layout-dot-gap) var(--layout-dot-gap)",
        color: colors.ink,
        fontFamily: "var(--font-body)",
        fontWeight: "var(--weight-bold)",
        fontSize: "var(--type-label-size)",
        lineHeight: "var(--type-label-line-height)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {statusBar && <StatusBar />}
      <div style={{ position: "absolute", inset: `${top}px 0 0 0`, overflow: "hidden" }}>{children}</div>
    </AbsoluteFill>
  );
}
