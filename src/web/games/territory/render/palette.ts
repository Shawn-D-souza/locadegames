import { colors, darken, getPlayerColor, lighten, mix, withAlpha } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/** Territory's colors, all from the theme: players are their colors; the arena is the app's calm ink and paper. */

export interface PlayerPaint {
  land: string;
  /** The light band along the land's top edges. */
  landEdge: string;
  lip: string;
  trailEdge: string;
  trailInner: string;
  head: string;
  /** The light band along the head's top edges. */
  headEdge: string;
  /** The head's side faces, darkest (turned from the light) to lightest. */
  headSides: string[];
  /** The soft outline around the head and its feathers: a dark shade of its own color. */
  headOutline: string;
  /** The crest's feathers and their lighter middle. */
  crest: string;
  crestShine: string;
  /** The head's top seen through the leader's crown, in its shadow. */
  crownHole: string;
  /** Your new land before your color reaches it, and the shine just behind the color's front (clear and full). */
  landPale: string;
  landShineClear: string;
  landShine: string;
  /** The soft puffs and light grains a head kicks up behind it in its own land, and its dark grains. */
  wake: string;
  wakeGrain: string;
}

const LOOK = TERRITORY_CLIENT_CONFIG.look;
const cache = new Map<number, PlayerPaint>();

export function playerPaint(id: number): PlayerPaint {
  let paint = cache.get(id);
  if (!paint) {
    const c = getPlayerColor(id);
    paint = {
      land: c.base,
      landEdge: lighten(c.base, LOOK.landEdgeLighten),
      lip: c.dark,
      trailEdge: c.base,
      trailInner: lighten(c.base, LOOK.trailLighten),
      head: c.base,
      headEdge: lighten(c.base, LOOK.landEdgeLighten),
      headSides: Array.from({ length: 8 }, (_, i) => darken(c.base, 0.45 - (0.33 * i) / 7)),
      headOutline: darken(c.base, LOOK.head.outlineDarken),
      crest: c.base,
      crestShine: lighten(c.base, 0.4),
      crownHole: darken(c.base, LOOK.crown.holeDarken),
      landPale: lighten(c.base, LOOK.captureFill.paleLighten),
      landShineClear: withAlpha(lighten(c.base, LOOK.captureFill.shineLighten), 0),
      landShine: withAlpha(lighten(c.base, LOOK.captureFill.shineLighten), 0.9),
      wake: lighten(c.base, LOOK.wake.lighten),
      wakeGrain: darken(c.base, LOOK.wake.grains.darken),
    };
    cache.set(id, paint);
  }
  return paint;
}

export const ARENA_PAINT = {
  /** Beyond the wall: a deeper calm tone, so the arena stands out as a raised plate. */
  outside: colors.inkSoft,
  /** The arena's floor: the platform's pale background, so white (flashes, name tags) stands out on it. */
  floor: colors.background,
  /** The minimap's floor stays white. */
  minimapFloor: colors.white,
  floorDot: colors.line,
  wall: colors.ink,
  ink: colors.ink,
  /** A head's flat shadow on the ground. */
  headShadow: withAlpha(colors.ink, 0.18),
  /**
   * The leader's crown, all one gold: its band shaded from deep gold (away from the light) to gold light,
   * its rim's top in the light, its balls (body, lit side, shine), a soft outline in a darker gold.
   */
  crownShades: Array.from({ length: 8 }, (_, i) => mix(darken(colors.gold, 0.12), colors.goldLight, (i / 7) * 0.8)),
  crownRim: mix(colors.gold, colors.goldLight, 0.85),
  crownInnerWall: darken(colors.gold, 0.08),
  crownBall: colors.gold,
  crownBallLit: mix(colors.gold, colors.goldLight, 0.75),
  crownShine: lighten(colors.goldLight, 0.7),
  crownOutline: darken(colors.gold, LOOK.crown.outlineDarken),
  white: colors.white,
  flash: colors.white,
  nameTag: colors.white,
} as const;
