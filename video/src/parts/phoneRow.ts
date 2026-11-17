import { FRAME } from "../look";
import { PHONE_SCREEN } from "./Phone";

/** The four friends' phones in a row on the page (scene px): screen width, gap, and each one's tilt and nudge, as in the style frame. */
export const SCREEN_W = 300;
export const SCREEN_H = (SCREEN_W * PHONE_SCREEN.height) / PHONE_SCREEN.width;
const OUTER_W = SCREEN_W * 1.07;
const GAP = 80;
const ROW_LEFT = (FRAME.width - (OUTER_W * 4 + GAP * 3)) / 2;
const ROW_TOP = 74;
export const TILT = [-2, 1.5, -1, 2];
const NUDGE = [0, -14, 8, -6];

/** Where a friend's phone sits: the middle of its slot in the row. */
export const slotCenter = (i: number) => ({ x: ROW_LEFT + OUTER_W / 2 + i * (OUTER_W + GAP), y: ROW_TOP + (SCREEN_H * 1.07) / 2 + NUDGE[i]! });

/** A point on a friend's screen (CSS px of the phone's screen, status bar included) on the page. */
export function screenToScene(i: number, p: { x: number; y: number }) {
  const c = slotCenter(i);
  const k = SCREEN_W / PHONE_SCREEN.width;
  return { x: c.x + (p.x - PHONE_SCREEN.width / 2) * k, y: c.y + (p.y - PHONE_SCREEN.height / 2) * k };
}
