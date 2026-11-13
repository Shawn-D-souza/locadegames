import { MARK, type CellMark } from "../../../shared/games/seabattle/types";

/**
 * A tile of the waters: floating, lit from above; sunk by a miss (the water shows, a ripple on it); burnt dark by a
 * hit (smoke rises off it); gone under a sunk ship (the wreck lies in the water).
 */
export const TILE_CLASSES = {
  open: "sea-tile",
  missed: "bg-transparent",
  burnt: "sea-burnt",
  wreck: "bg-transparent",
} as const;

/** A tile's look from what was shot there, and whether a sunk ship lies on it. */
export function tileLook(mark: CellMark | undefined, wrecked: boolean): string {
  if (mark === MARK.miss) return TILE_CLASSES.missed;
  if (mark === MARK.hit) return wrecked ? TILE_CLASSES.wreck : TILE_CLASSES.burnt;
  return TILE_CLASSES.open;
}
