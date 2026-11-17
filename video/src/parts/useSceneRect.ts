import { useLayoutEffect, useState, type RefObject } from "react";
import { useCurrentScale } from "remotion";
import { toScene, type Camera } from "./camera";

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where an element sits in the scene (before the camera), measured after layout every frame: the camera can then aim
 * at it. `root` is the frame's own box; `camRef` holds the camera this frame was drawn with (set while rendering).
 */
export function useSceneRect(root: RefObject<HTMLElement | null>, target: RefObject<HTMLElement | null>, camRef: RefObject<Camera>): SceneRect | null {
  const [rect, setRect] = useState<SceneRect | null>(null);
  const scale = useCurrentScale();
  useLayoutEffect(() => {
    const r = root.current?.getBoundingClientRect();
    const t = target.current?.getBoundingClientRect();
    if (!r || !t) return;
    const a = toScene(camRef.current, { x: (t.left - r.left) / scale, y: (t.top - r.top) / scale });
    const b = toScene(camRef.current, { x: (t.right - r.left) / scale, y: (t.bottom - r.top) / scale });
    const next = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
    setRect((prev) => (prev && Math.abs(prev.x - next.x) + Math.abs(prev.y - next.y) + Math.abs(prev.width - next.width) < 0.5 ? prev : next));
  });
  return rect;
}
