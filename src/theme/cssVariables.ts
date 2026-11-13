import { colors } from "./colors";
import { durations, easings, transforms } from "./motion";
import { lips, opacity, radii, strokes } from "./radii";
import { layout, seaTiles, spacing } from "./spacing";
import { fluidType, fonts, fontWeights, typeScale } from "./typography";

function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const px = (value: number) => `${value}px`;
const ms = (value: number) => `${value}ms`;

/** Flattens the theme tokens into CSS custom properties, the only source CSS may use. */
export function buildCssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, value] of Object.entries(colors)) vars[`--color-${kebab(name)}`] = value;
  for (const [name, value] of Object.entries(spacing)) vars[`--space-${name}`] = px(value);
  for (const [name, value] of Object.entries(layout)) vars[`--layout-${kebab(name)}`] = px(value);
  for (const [name, value] of Object.entries(seaTiles)) vars[`--sea-tile-${kebab(name)}`] = `${value}cqw`;
  for (const [name, value] of Object.entries(radii)) vars[`--radius-${kebab(name)}`] = px(value);
  for (const [name, value] of Object.entries(strokes)) vars[`--stroke-${kebab(name)}`] = px(value);
  for (const [name, value] of Object.entries(lips)) vars[`--lip-${name}`] = px(value);
  for (const [name, value] of Object.entries(opacity)) vars[`--opacity-${kebab(name)}`] = String(value);
  for (const [name, value] of Object.entries(fonts)) vars[`--font-${name}`] = value;
  for (const [name, value] of Object.entries(fontWeights)) vars[`--weight-${name}`] = String(value);
  for (const [name, value] of Object.entries(typeScale)) {
    vars[`--type-${name}-size`] = px(value.size);
    vars[`--type-${name}-line-height`] = String(value.lineHeight);
    vars[`--type-${name}-tracking`] = value.tracking;
  }
  for (const [name, value] of Object.entries(fluidType)) vars[`--fluid-${kebab(name)}`] = value;
  for (const [name, value] of Object.entries(durations)) vars[`--duration-${kebab(name)}`] = ms(value);
  for (const [name, value] of Object.entries(easings)) vars[`--ease-${name}`] = value;
  for (const [name, value] of Object.entries(transforms)) vars[`--transform-${kebab(name)}`] = String(value);
  return vars;
}
