import { HEADCRASH_CONFIG } from "../../../../shared/games/headcrash/config";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import { ARENA_PAINT } from "./palette";

const LOOK = HEADCRASH_CLIENT_CONFIG.look;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** The burst where a head was hit: a spiky star that snaps open and fades, with a ring racing out of it. */
export function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, ageMs: number) {
  const t = ageMs / LOOK.burstMs;
  if (t >= 1) return;
  const grow = easeOut(Math.min(1, t * 3));
  const radius = LOOK.burstRadius * (0.35 + 0.65 * grow);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - t * t;
  ctx.beginPath();
  for (let i = 0; i < LOOK.burstSpikes * 2; i++) {
    const angle = (i / (LOOK.burstSpikes * 2)) * 2 * Math.PI + 0.3;
    const reach = i % 2 === 0 ? radius : radius * 0.5;
    if (i === 0) ctx.moveTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
    else ctx.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  ctx.closePath();
  ctx.fillStyle = ARENA_PAINT.burst;
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.outline;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.3, 0, 2 * Math.PI);
  ctx.fillStyle = ARENA_PAINT.burstCore;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, LOOK.burstRadius * (0.4 + 1.1 * easeOut(t)), 0, 2 * Math.PI);
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.outline * (1 - t) * 2;
  ctx.stroke();
  ctx.restore();
}

/** Drops thrown up where the water took a head. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, ageMs: number) {
  const t = ageMs / LOOK.splashMs;
  if (t >= 1) return;
  const seconds = ageMs / 1000;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = ARENA_PAINT.ink;
  for (let i = 0; i < LOOK.splashDrops; i++) {
    const spread = (i / (LOOK.splashDrops - 1) - 0.5) * 1.6;
    const speed = LOOK.splashSpeed * (0.6 + 0.4 * Math.cos(i * 2.4));
    const dx = Math.sin(spread) * speed * seconds;
    const dy = Math.cos(spread) * speed * seconds - (HEADCRASH_CONFIG.gravity / 2) * seconds * seconds;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 0.14 * (1 - t * 0.5), 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

export interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
}

/** Puffs kicked up behind a driving wheel: they drift, swell and fade. Drops the ones that are over. */
export function drawDust(ctx: CanvasRenderingContext2D, dust: Dust[], now: number) {
  ctx.fillStyle = ARENA_PAINT.dust;
  let kept = 0;
  for (const puff of dust) {
    const age = now - puff.bornAt;
    if (age >= LOOK.dustMs) continue;
    dust[kept++] = puff;
    const t = age / LOOK.dustMs;
    const seconds = age / 1000;
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.beginPath();
    ctx.arc(puff.x + puff.vx * seconds, puff.y + puff.vy * seconds, LOOK.dustSize * (0.5 + t), 0, 2 * Math.PI);
    ctx.fill();
  }
  dust.length = kept;
  ctx.globalAlpha = 1;
}
