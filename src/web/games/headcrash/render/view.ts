import type { Layout } from "../../../../shared/games/headcrash/types";
import type { WorldRect } from "./drawWorld";

/** How the world sits on the canvas: pixels per meter, and the canvas point (CSS pixels) of the world's (0, 0). */
export interface View {
  scale: number;
  originX: number;
  originY: number;
}

/** The map's whole frame, as big as fits, in the middle of a canvas `width` × `height` CSS pixels; the world fills the rest. */
export function fitArena(layout: Layout, width: number, height: number): View {
  const scale = Math.max(1, Math.min(width / (layout.maxX - layout.minX), height / (layout.topY - layout.floorY)));
  const middleX = (layout.minX + layout.maxX) / 2;
  const middleY = (layout.topY + layout.floorY) / 2;
  return { scale, originX: width / 2 - middleX * scale, originY: height / 2 + middleY * scale };
}

/** The part of the world a canvas `width` × `height` shows with this view, plus `margin` CSS pixels all round. */
export function visibleRect(view: View, width: number, height: number, margin = 0): WorldRect {
  return {
    left: (-margin - view.originX) / view.scale,
    right: (width + margin - view.originX) / view.scale,
    top: (view.originY + margin) / view.scale,
    bottom: (view.originY - height - margin) / view.scale,
  };
}
