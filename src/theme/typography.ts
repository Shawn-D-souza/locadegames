/** Type scale (DESIGN.md §3). Logo and headings use Roboto Condensed; everything else Roboto Mono. */
export const fonts = {
  display: "'Roboto Condensed', system-ui, sans-serif",
  body: "'Roboto Mono', ui-monospace, monospace",
} as const;

export const fontWeights = {
  medium: 500,
  bold: 700,
  black: 800,
} as const;

export const typeScale = {
  display: { size: 44, lineHeight: 1, tracking: "-0.01em" },
  title: { size: 28, lineHeight: 1.1, tracking: "0" },
  button: { size: 20, lineHeight: 1, tracking: "0.08em" },
  label: { size: 18, lineHeight: 1.3, tracking: "0" },
  /** Room code input: big spaced digits. */
  code: { size: 26, lineHeight: 1, tracking: "0.12em" },
  caption: { size: 14, lineHeight: 1.3, tracking: "0.06em" },
  /** Small pills on player bars (YOU, HOST, trophies). */
  badge: { size: 12, lineHeight: 1, tracking: "0.06em" },
  numeral: { size: 96, lineHeight: 1, tracking: "0" },
} as const;

/** Screen titles shrink with the screen width below this, so "LOCADE GAMES" fits on a 320px phone. */
export const fluidType = {
  titleFit: "8vw",
} as const;
