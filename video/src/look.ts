// The video's own numbers, on top of the app's theme (colors and fonts come from src/theme).
import { colors } from "../../src/theme/colors";
import { fonts } from "../../src/theme/typography";
import { getPlayerColor } from "../../src/theme/players";

export { colors, fonts };
export const player = (i: number) => getPlayerColor(i);

/** The frame: landscape 1080p at 60 frames a second. */
export const FRAME = { width: 1920, height: 1080, fps: 60 } as const;

/** The dotted page at video size: the app's grid, a little bigger so it reads at 1080p. */
export const PAGE = { dotGap: 36, dotRadius: 2.25 } as const;

/** How strong the dots are: as in the app, softer for video (less shimmer when the camera moves), or none. */
export type Dots = "app" | "soft" | "none";
export const DOTS: Record<Dots, { gap: number; radius: number; opacity: number }> = {
  app: { gap: PAGE.dotGap, radius: PAGE.dotRadius, opacity: 1 },
  soft: { gap: 44, radius: 2.4, opacity: 0.22 },
  none: { gap: 44, radius: 0, opacity: 0 },
};

/** How much bigger the app's own components are drawn on the page (CSS zoom). */
export const UI_ZOOM = 2;

export const TEXT = {
  /** The big lines (EVERYONE ON THEIR OWN PHONE.) */
  headline: 112,
  chat: 30,
  chatName: 19,
} as const;
