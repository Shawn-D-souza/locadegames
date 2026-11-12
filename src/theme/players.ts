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
/** How far toward white the light version goes: clearly the player's color, lighter than their marks, so a mark stands out on it. */
const LIGHT_AMOUNT = 0.35;
/** Dots Clash, the edge of a tile you may tap (owner direction: subtle, but a little stronger than `dark` / `light`): darker on yours, a soft version of your color on an empty one. */
const EDGE_DARK_AMOUNT = 0.35;
const EDGE_LIGHT_AMOUNT = 0.2;

export type PlayerPattern = "none" | "stripes" | "dots" | "checks";
const PATTERNS: readonly PlayerPattern[] = ["none", "stripes", "dots", "checks"];

export interface PlayerColor {
  name: string;
  base: string;
  dark: string;
  tint: string;
  /** Lighter solid version of the color: a won small board's fill under its big mark (Ultimate Tic-tac-toe). */
  light: string;
  /** Very light solid version of the color: the match screen background on this player's turn. */
  wash: string;
  /** A little darker than `dark`: the edge of a tile of yours you may tap (Dots Clash). */
  edge: string;
  /** Between `base` and `light`: the edge of an empty tile you may pick (Dots Clash). */
  edgeLight: string;
  /** White or ink, whichever reads better on `base` (player bars, labels). */
  text: string;
  pattern: PlayerPattern;
}

function colorFamily(name: string, hex: string, pattern: PlayerPattern): PlayerColor {
  return {
    name,
    base: hex,
    dark: darken(hex, DARK_AMOUNT),
    tint: withAlpha(hex, TINT_ALPHA),
    light: lighten(hex, LIGHT_AMOUNT),
    wash: lighten(hex, WASH_AMOUNT),
    edge: darken(hex, EDGE_DARK_AMOUNT),
    edgeLight: lighten(hex, EDGE_LIGHT_AMOUNT),
    text: readableText(hex, colors.white, colors.ink),
    pattern,
  };
}

/** Color identity for a 0-based join index; colors repeat with a pattern per cycle. */
export function getPlayerColor(index: number): PlayerColor {
  const color = playerColors[index % playerColors.length]!;
  const cycle = Math.floor(index / playerColors.length);
  return colorFamily(color.name, color.hex, PATTERNS[cycle % PATTERNS.length]!);
}

/** A player who quit a game whose pieces stay on the board (Dots Clash): the offline grey, so they read as out of play. */
export const quitColor = (): PlayerColor => colorFamily("Grey", colors.offline, "none");
