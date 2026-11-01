import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { Point } from "../../../../shared/games/territory/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";

const CAM = TERRITORY_CLIENT_CONFIG.camera;
const W = TERRITORY_CONFIG.trailWidth;

/** Where the view looks and how close, eased toward its target so following and zooming out are smooth. */
export class Camera {
  x = 0;
  y = 0;
  /** CSS px per world unit. */
  scale = 0;

  update(focus: Point | null, radius: number, width: number, height: number, elapsedMs: number) {
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    const target = focus
      ? { x: focus.x, y: focus.y, scale: Math.max(shortSide / (CAM.shortSideWidths * W), longSide / (CAM.longSideMaxWidths * W)) }
      : { x: 0, y: 0, scale: (shortSide * (1 - 2 * CAM.overviewMargin)) / (2 * radius) };
    if (this.scale === 0) {
      Object.assign(this, target);
      return;
    }
    // Following your head: locked on (your head must never lag behind your thumb). Zooming: eased.
    const ease = 1 - Math.pow(1 - CAM.follow, elapsedMs / (1000 / 60));
    const zooming = Math.abs(target.scale - this.scale) / target.scale > 0.01;
    if (focus && !zooming) {
      this.x = target.x;
      this.y = target.y;
    } else {
      this.x += (target.x - this.x) * ease;
      this.y += (target.y - this.y) * ease;
    }
    this.scale += (target.scale - this.scale) * ease;
  }

  toScreen(p: Point, width: number, height: number): Point {
    return { x: (p.x - this.x) * this.scale + width / 2, y: (p.y - this.y) * this.scale + height / 2 };
  }
}
