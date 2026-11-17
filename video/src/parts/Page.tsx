import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { colors, DOTS, type Dots } from "../look";

/** The app's dotted page: pale background, ink dot grid. Everything sits on it. */
export function Page({ children, style, dots = "soft" }: { children?: ReactNode; style?: CSSProperties; dots?: Dots }) {
  const d = DOTS[dots];
  const dot = `rgb(49 44 133 / ${d.opacity})`;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        backgroundImage: d.opacity ? `radial-gradient(circle, ${dot} ${d.radius}px, transparent ${d.radius + 0.6}px)` : "none",
        backgroundSize: `${d.gap}px ${d.gap}px`,
        backgroundPosition: `${d.gap / 2}px ${d.gap / 2}px`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
