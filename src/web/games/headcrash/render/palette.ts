import { colors, getPlayerColor, withAlpha } from "../../../../theme";
import { HEADCRASH_CLIENT_CONFIG } from "../config";

/** Head Crash's colors, all from the theme: cars are their players' colors; the world is the theme's sky, ground and water. */

export interface CarPaint {
  body: string;
  /** The hub of each wheel (flat colors, no shine: the design has no gloss); the rims and the stripe on the helmet are `body`. */
  bodyLow: string;
  helmet: string;
}

const cache = new Map<number, CarPaint>();

export function carPaint(playerId: number): CarPaint {
  let paint = cache.get(playerId);
  if (!paint) {
    const c = getPlayerColor(playerId);
    paint = { body: c.base, bodyLow: c.dark, helmet: c.light };
    cache.set(playerId, paint);
  }
  return paint;
}

export const ARENA_PAINT = {
  /** The world (DESIGN.md, Game worlds): pale sky so every car stands out, hills far behind, indigo ground with pebbles, an ink outline. */
  sky: colors.sky,
  hills: [colors.skyHillFar, colors.skyHillNear],
  cloud: colors.white,
  ground: colors.ground,
  pebble: colors.groundPebble,
  /** What throws or moves a car (a bounce pad, a fan): the action color. */
  gadget: colors.coral,
  /** A fan's rising air, drawn faintly over the sky. */
  fanAir: withAlpha(colors.white, HEADCRASH_CLIENT_CONFIG.look.fanAirAlpha),
  ink: colors.ink,
  tire: colors.ink,
  visor: colors.ink,
  /** The stripe down a car's side (white shows on every player's color), its exhaust pipe. The lights: yellow at the front, coral at the back. Dizzy stars after a hit. */
  stripe: colors.white,
  exhaust: colors.inkSoft,
  headlight: colors.waiting,
  /** A car's windscreen: the water's pale blue reads as glass against the lavender sky. */
  glass: colors.waterCrest,
  taillight: colors.coral,
  star: colors.waiting,
  /** Water in front of everything (royal blue, never a player's color), its pale band on top, and that band once it rises (white foam: it stays in the water's colors; owner: the coral didn't fit). */
  water: withAlpha(colors.water, HEADCRASH_CLIENT_CONFIG.look.waterAlpha),
  waterCrest: colors.waterCrest,
  waterRising: colors.white,
  dust: colors.inkSoft,
  burst: colors.white,
  burstCore: colors.waiting,
  white: colors.white,
} as const;
