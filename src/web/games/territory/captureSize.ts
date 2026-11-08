import { TERRITORY_CLIENT_CONFIG } from "./config";

const SIZE = TERRITORY_CLIENT_CONFIG.captureSize;

export type CaptureSize = "small" | "medium" | "large";

/** How big a piece of new land is (area in world units): picks its sound and the head's hop for joy. */
export function captureSize(area: number): CaptureSize {
  if (area >= SIZE.largeArea) return "large";
  if (area >= SIZE.mediumArea) return "medium";
  return "small";
}
