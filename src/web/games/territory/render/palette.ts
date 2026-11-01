import { colors, getPlayerColor, lighten } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/** Territory's colors, all from the theme: players are their colors; the arena is the app's calm ink and paper. */

export interface PlayerPaint {
  land: string;
  lip: string;
  trailEdge: string;
  trailInner: string;
  head: string;
  headLip: string;
}

const cache = new Map<number, PlayerPaint>();

export function playerPaint(id: number): PlayerPaint {
  let paint = cache.get(id);
  if (!paint) {
    const c = getPlayerColor(id);
    paint = {
      land: c.base,
      lip: c.dark,
      trailEdge: c.base,
      trailInner: lighten(c.base, TERRITORY_CLIENT_CONFIG.look.trailLighten),
      head: c.base,
      headLip: c.dark,
    };
    cache.set(id, paint);
  }
  return paint;
}

export const ARENA_PAINT = {
  /** Beyond the wall. */
  outside: colors.line,
  floor: colors.white,
  floorDot: colors.line,
  wall: colors.ink,
  ink: colors.ink,
  white: colors.white,
  flash: colors.white,
  nameTag: colors.white,
} as const;
