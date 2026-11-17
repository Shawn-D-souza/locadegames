import type { CSSProperties, ReactNode } from "react";
import { colors, fonts, TEXT } from "../look";

/** A big line of the video's text, in a white card (text never sits straight on the dot grid). */
export function TextCard({ children, size = TEXT.headline, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: colors.white,
        border: `4px solid ${colors.ink}`,
        borderRadius: 40,
        padding: `${size * 0.2}px ${size * 0.5}px`,
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        color: colors.ink,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
