import type { CSSProperties, ReactNode } from "react";
import { Img } from "remotion";
import { colors } from "../look";

/** A phone screen's size in CSS pixels (an iPhone 14); the screens are rendered at this size, 3x. */
export const PHONE_SCREEN = { width: 390, height: 844 } as const;

const BEZEL = 0.035; // of the screen's short side
const RADIUS = 0.15;

/**
 * A phone in the app's style: an ink body round a real screen, with a solid ink lip under it. `width` is the screen's
 * width as drawn; held `sideways`, the screen is landscape and the camera sits on the left. The screen is a picture
 * (`src`) or anything sized to fill it (`screen`: a clip).
 */
export function Phone({ src, screen, width, sideways = false, style }: { src?: string; screen?: ReactNode; width: number; sideways?: boolean; style?: CSSProperties }) {
  const ratio = PHONE_SCREEN.height / PHONE_SCREEN.width;
  const height = sideways ? width / ratio : width * ratio;
  const short = Math.min(width, height);
  const bezel = short * BEZEL;
  const island = { long: short * 0.28, short: short * 0.075, inset: bezel + short * 0.03 };
  return (
    <div
      style={{
        position: "relative",
        width: width + bezel * 2,
        height: height + bezel * 2,
        padding: bezel,
        borderRadius: short * RADIUS + bezel,
        background: colors.ink,
        boxShadow: `0 ${short * 0.03}px 0 #1d1955`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ width, height, borderRadius: short * RADIUS, overflow: "hidden", position: "relative", background: colors.background }}>
        {screen ?? (src && <Img src={src} style={{ width, height, display: "block" }} />)}
      </div>
      <div
        style={{
          position: "absolute",
          borderRadius: 999,
          background: colors.ink,
          ...(sideways
            ? { left: island.inset, top: "50%", width: island.short, height: island.long, transform: "translateY(-50%)" }
            : { top: island.inset, left: "50%", width: island.long, height: island.short, transform: "translateX(-50%)" }),
        }}
      />
    </div>
  );
}

/** A phone's outer size for a screen `width` wide, upright. */
export function phoneSize(width: number) {
  const height = (width * PHONE_SCREEN.height) / PHONE_SCREEN.width;
  const bezel = width * BEZEL;
  return { width: width + bezel * 2, height: height + bezel * 2, bezel, screenHeight: height };
}
