import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import { ARENA_PAINT, type PlayerPaint } from "./palette";

/**
 * The leader's crown: one chunky gold ring faked in 3D like the head (owner: like Paper.io's, one piece,
 * gold, not paper), seen from above at the head's tilt. Its band is shaded face by face by which way it
 * points (light from the upper left), its thick rim's top is in the light, the head's top shows through
 * the hole in its shadow with the inner wall at the back, and round balls sit on the rim, turning with
 * the head. One soft outline in a darker gold around the ring, none between its parts. Drawn in two
 * parts: the back (rim, hole, far balls) and the front (band, near balls).
 */

const W = TERRITORY_CONFIG.trailWidth;
const LOOK = TERRITORY_CLIENT_CONFIG.look;
const C = LOOK.crown;
const SIZE = LOOK.headSize * W;
const TILT = LOOK.head.tilt;
const R = C.radius * SIZE;
const BAND = C.band * SIZE;
const HOLE = R - C.wall * SIZE;
const BALL = C.ball * SIZE;
/** Where the balls sit: the middle of the rim. */
const BALL_AT = (R + HOLE) / 2;
const BALL_RISE = C.ballRise * BALL;
/** Faces around the band (only the near half is drawn). */
const FACES = 24;
const LIGHT = (() => {
  const length = Math.hypot(LOOK.head.light[0], LOOK.head.light[1]);
  return [LOOK.head.light[0] / length, LOOK.head.light[1] / length] as const;
})();

/** How far above the head's top the crown reaches (world units): its far balls. */
export const CROWN_HEIGHT = C.gap * W + BAND + R * TILT + BALL_RISE + BALL;

/** The shade of a band face pointing along `phi` (on the ground), lit from the upper left. */
function shade(phi: number): string {
  const lit = Math.max(0, Math.min(1, 0.5 + 0.5 * (Math.cos(phi) * LIGHT[0] + Math.sin(phi) * LIGHT[1])));
  const shades = ARENA_PAINT.crownShades;
  return shades[Math.round(lit * (shades.length - 1))] ?? shades[0]!;
}

/** The rim's top, the hole (the head's top in shadow, the inner wall at the back) and the far balls. (x, base): the middle of the crown's bottom. */
export function drawCrownBack(ctx: CanvasRenderingContext2D, paint: PlayerPaint, x: number, base: number, angle: number, outline: number) {
  const rim = base - C.gap * W - BAND;
  // The whole ring seen from above, outlined once (the band is drawn over its near half later).
  ctx.beginPath();
  ctx.ellipse(x, rim, R, R * TILT, 0, 0, Math.PI * 2);
  ctx.fillStyle = ARENA_PAINT.crownRim;
  ctx.fill();
  ctx.lineWidth = outline;
  ctx.strokeStyle = ARENA_PAINT.crownOutline;
  ctx.stroke();
  // The hole: the inner wall at the back, the head's top lower down in front of it.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, rim, HOLE, HOLE * TILT, 0, 0, Math.PI * 2);
  ctx.fillStyle = ARENA_PAINT.crownInnerWall;
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x, rim + BAND * C.innerWall, HOLE, HOLE * TILT, 0, 0, Math.PI * 2);
  ctx.fillStyle = paint.crownHole;
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < C.balls; i++) {
    const phi = angle + (i * 2 * Math.PI) / C.balls;
    if (Math.sin(phi) < 0) drawBall(ctx, x, rim, phi);
  }
}

/** The band and the near balls. */
export function drawCrownFront(ctx: CanvasRenderingContext2D, x: number, base: number, angle: number, outline: number) {
  const bottom = base - C.gap * W;
  const rim = bottom - BAND;
  // The band's near half, face by face, then its outline down both sides and along the bottom.
  ctx.lineWidth = LOOK.head.seam * W;
  for (let k = 0; k < FACES; k++) {
    const a = (k / FACES) * 2 * Math.PI;
    const b = ((k + 1) / FACES) * 2 * Math.PI;
    if (Math.sin((a + b) / 2) <= 0) continue;
    const color = shade((a + b) / 2);
    ctx.beginPath();
    ctx.moveTo(x + R * Math.cos(a), rim + R * TILT * Math.sin(a));
    ctx.lineTo(x + R * Math.cos(b), rim + R * TILT * Math.sin(b));
    ctx.lineTo(x + R * Math.cos(b), bottom + R * TILT * Math.sin(b));
    ctx.lineTo(x + R * Math.cos(a), bottom + R * TILT * Math.sin(a));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + R, rim);
  ctx.lineTo(x + R, bottom);
  ctx.ellipse(x, bottom, R, R * TILT, 0, 0, Math.PI);
  ctx.lineTo(x - R, rim);
  ctx.lineJoin = "round";
  ctx.lineWidth = outline;
  ctx.strokeStyle = ARENA_PAINT.crownOutline;
  ctx.stroke();
  for (let i = 0; i < C.balls; i++) {
    const phi = angle + (i * 2 * Math.PI) / C.balls;
    if (Math.sin(phi) >= 0) drawBall(ctx, x, rim, phi);
  }
}

/** A round ball sitting on the rim at `phi`: its body, its lit upper left, a shine. No outline: it's part of the ring. */
function drawBall(ctx: CanvasRenderingContext2D, x: number, rim: number, phi: number) {
  const bx = x + BALL_AT * Math.cos(phi);
  const by = rim + BALL_AT * TILT * Math.sin(phi) - BALL_RISE;
  ctx.beginPath();
  ctx.arc(bx, by, BALL, 0, Math.PI * 2);
  ctx.fillStyle = ARENA_PAINT.crownBall;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx - BALL * 0.18, by - BALL * 0.18, BALL * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = ARENA_PAINT.crownBallLit;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx - BALL * 0.38, by - BALL * 0.38, BALL * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = ARENA_PAINT.crownShine;
  ctx.fill();
}
