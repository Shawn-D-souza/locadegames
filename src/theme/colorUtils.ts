/** Pure hex color helpers used to derive player dark/tint variants. */

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");
}

/** Mixes the color toward black by `amount` (0–1). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const keep = 1 - amount;
  return `#${toHex(r * keep)}${toHex(g * keep)}${toHex(b * keep)}`.toUpperCase();
}

/** Mixes the color toward white by `amount` (0–1). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (channel: number) => channel + (255 - channel) * amount;
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`.toUpperCase();
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** WCAG relative luminance (0 = black, 1 = white). */
function luminance(hex: string): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Whichever of the two text colors reads better on `background`. */
export function readableText(background: string, first: string, second: string): string {
  return contrastRatio(background, first) >= contrastRatio(background, second) ? first : second;
}
