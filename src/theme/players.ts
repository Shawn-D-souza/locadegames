import { colors } from "./colors";
import { darken, lighten, readableText, withAlpha } from "./colorUtils";

/** Reserved player colors, assigned in join order (DESIGN.md §2). Indigo is never a player color. */
export const playerColors = [
  { name: "Red", hex: "#D7263D" },
  { name: "Blue", hex: "#00BFEF" },
  { name: "Green", hex: "#78C840" },
  { name: "Yellow", hex: "#FFC02E" },
  { name: "Purple", hex: "#9B5CFF" },
  { name: "Orange", hex: "#FF8A1F" },
  { name: "Pink", hex: "#FF4FB3" },
  { name: "Teal", hex: "#16C2A3" },
  { name: "Maroon", hex: "#9E2A4A" },
  { name: "Lime", hex: "#C6E030" },
  { name: "Brown", hex: "#A8683A" },
  { name: "Gray", hex: "#8A94A6" },
] as const;

const DARK_AMOUNT = 0.25;
const TINT_ALPHA = 0.4;
/** How far toward white the screen wash goes; ink text must stay readable on it (tested). */
const WASH_AMOUNT = 0.6;

export type PlayerPattern = "none" | "stripes" | "dots" | "checks";
const PATTERNS: readonly PlayerPattern[] = ["none", "stripes", "dots", "checks"];

export interface PlayerColor {
  name: string;
  base: string;
  dark: string;
  tint: string;
  /** Very light solid version of the color: the match screen background on this player's turn. */
  wash: string;
  /** White or ink, whichever reads better on `base` (player bars, labels). */
  text: string;
  pattern: PlayerPattern;
}

/** Color identity for a 0-based join index; colors repeat with a pattern per cycle. */
export function getPlayerColor(index: number): PlayerColor {
  const color = playerColors[index % playerColors.length]!;
  const cycle = Math.floor(index / playerColors.length);
  return {
    name: color.name,
    base: color.hex,
    dark: darken(color.hex, DARK_AMOUNT),
    tint: withAlpha(color.hex, TINT_ALPHA),
    wash: lighten(color.hex, WASH_AMOUNT),
    text: readableText(color.hex, colors.white, colors.ink),
    pattern: PATTERNS[cycle % PATTERNS.length]!,
  };
}
