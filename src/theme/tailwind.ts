import plugin from "tailwindcss/plugin";
import { colors } from "./colors";
import { buildCssVariables } from "./cssVariables";
import { durations, easings } from "./motion";
import { lips, opacity, radii, strokes } from "./radii";
import { breakpoints, layout, spacing } from "./spacing";
import { fonts, fontWeights, typeScale } from "./typography";

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const px = (value: number) => `${value}px`;

/** `{ inkSoft: 3 }` → `{ "ink-soft": format(3) }`: token names become class names (`bg-ink-soft`). */
function named<T>(tokens: Record<string, T>, format: (value: T) => string, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens).map(([name, value]) => [prefix + kebab(name), format(value)]));
}

/**
 * The theme tokens as Tailwind's whole theme (Tailwind's own defaults are not loaded), so classes like
 * `bg-ink`, `p-4`, `rounded-card` or `text-caption` exist and nothing off-theme does. Also puts every
 * token on `:root` as a CSS variable for the rules written in CSS (animations, backgrounds).
 */
export default plugin(({ addBase }) => addBase({ ":root": buildCssVariables() }), {
  theme: {
    colors: {
      ...named(colors, String),
      transparent: "transparent",
      current: "currentColor",
      // Whichever player an element belongs to, set by `playerStyle()`.
      player: "var(--player)",
      "player-dark": "var(--player-dark)",
      "player-tint": "var(--player-tint)",
      "player-light": "var(--player-light)",
      "player-wash": "var(--player-wash)",
      "player-text": "var(--player-text)",
    },
    screens: named(breakpoints, px),
    spacing: { ...named(spacing, px), ...named(layout, px), ...named(lips, px, "lip-") },
    borderRadius: named(radii, px),
    borderWidth: { 0: "0px", ...named(strokes, px) },
    boxShadow: {
      ...named(lips, (size) => `0 ${px(size)} 0 ${colors.ink}`, "lip-"),
      // A pressed button: the lip squashed flat (same shape, so it animates).
      pressed: `0 0 0 ${colors.ink}`,
      // A focused field: its outline thickens inward, so nothing moves.
      focus: `inset 0 0 0 ${px(strokes.outline - strokes.thin)} ${colors.ink}`,
      // A chosen swatch: an outline ring around it.
      selected: `0 0 0 ${px(strokes.outline)} ${colors.ink}`,
      none: "none",
    },
    opacity: named(opacity, String),
    fontFamily: fonts,
    fontWeight: named(fontWeights, String),
    fontSize: Object.fromEntries(Object.entries(typeScale).map(([name, t]) => [name, [px(t.size), { lineHeight: String(t.lineHeight) }]])),
    letterSpacing: Object.fromEntries(Object.entries(typeScale).map(([name, t]) => [name, t.tracking])),
    transitionDuration: named(durations, (ms) => `${ms}ms`),
    transitionTimingFunction: { ...easings, linear: "linear" },
    zIndex: { behind: "-1", toast: "10", modal: "20", devTool: "30" },
  },
});
