import { FRAME } from "../look";

/** A camera over a flat scene: how big it draws the scene, and which scene point sits at the frame's middle. */
export interface Camera {
  scale: number;
  focus: { x: number; y: number };
}

export const CENTER = { x: FRAME.width / 2, y: FRAME.height / 2 } as const;
export const REST: Camera = { scale: 1, focus: CENTER };

/** The CSS transform that puts `cam.focus` at the frame's middle, `cam.scale` times bigger (origin top left). */
export function cameraTransform(cam: Camera): string {
  const tx = CENTER.x - cam.focus.x * cam.scale;
  const ty = CENTER.y - cam.focus.y * cam.scale;
  return `translate(${tx}px, ${ty}px) scale(${cam.scale})`;
}

/** A point on screen back to the scene (undoes `cameraTransform`). */
export function toScene(cam: Camera, p: { x: number; y: number }) {
  return { x: (p.x - CENTER.x) / cam.scale + cam.focus.x, y: (p.y - CENTER.y) / cam.scale + cam.focus.y };
}

/** Between two cameras: scale in even steps of size (log), focus by its own easing so it leads the zoom. */
export function blendCamera(a: Camera, b: Camera, zoomT: number, focusT = zoomT): Camera {
  return {
    scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * zoomT),
    focus: { x: a.focus.x + (b.focus.x - a.focus.x) * focusT, y: a.focus.y + (b.focus.y - a.focus.y) * focusT },
  };
}
