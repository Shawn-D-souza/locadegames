import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { Land, Point } from "../../../../shared/games/territory/types";
import { lighten } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { EffectView, EndingView, PlayerFrame } from "../engine/frame";
import { drawHeads } from "./drawHeads";
import { ARENA_PAINT, playerPaint } from "./palette";
import { landPath } from "./paths";
import { winnerHeadAngle } from "./winnerHeadSpin";

/**
 * The match's ending, drawn on the arena: a thump, everyone but the winners washing out, rays in the
 * winner's color turning around the arena, and a big copy of each winner's head dropping onto them with a
 * crown, spinning round to face us. All keyed to the ending's start, so it plays the same on every frame rate.
 */

const LOOK = TERRITORY_CLIENT_CONFIG.look;
const W = TERRITORY_CONFIG.trailWidth;
const RAYS_REACH = 3;
const RAY_LIGHTEN = 0.55;

/** 0 → 1 over `durationMs` after `atMs` (ms since the ending started). */
function progress(sinceMs: number, atMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, (sinceMs - atMs) / durationMs));
}

/** Overshoots a little, then settles (a drop that lands with a bounce). */
function easeOutBack(t: number): number {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

/** The camera's thump when the match ends: a quick zoom in and back. */
export function thumpScale(ending: EndingView | null, now: number): number {
  if (!ending) return 1;
  const t = (now - ending.startedAt) / LOOK.thumpMs;
  return t >= 0 && t < 1 ? 1 + LOOK.thumpScale * Math.sin(Math.PI * t) : 1;
}

/** The view's shake (CSS px offset), strongest at the start and dying out. */
export function shakeOffset(effects: readonly EffectView[], now: number): Point {
  let x = 0;
  let y = 0;
  for (const e of effects) {
    if (e.kind !== "shake") continue;
    const t = (now - e.startedAt) / LOOK.shakeMs;
    if (t < 0 || t >= 1) continue;
    const size = (e.strength === "hard" ? LOOK.shakeHardPx : LOOK.shakeLightPx) * (1 - t) * (1 - t);
    // Two different frequencies, so it shakes rather than slides.
    x += size * Math.sin(t * 47);
    y += size * Math.cos(t * 31);
  }
  return { x, y };
}

/** Rays in the first winner's color turning around the arena (behind it, in world units). */
export function drawRays(ctx: CanvasRenderingContext2D, ending: EndingView, radius: number, now: number) {
  const since = now - ending.startedAt;
  const alpha = progress(since, LOOK.raysAtMs, LOOK.raysFadeMs);
  const winner = ending.winners[0];
  if (alpha === 0 || winner === undefined) return;
  const reach = radius * RAYS_REACH;
  const turn = (since / 1000) * LOOK.raysTurnPerS * Math.PI * 2;
  const wedge = Math.PI / LOOK.rayCount;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = lighten(playerPaint(winner).land, RAY_LIGHTEN);
  ctx.beginPath();
  for (let i = 0; i < LOOK.rayCount; i++) {
    const a = turn + i * wedge * 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
    ctx.lineTo(Math.cos(a + wedge) * reach, Math.sin(a + wedge) * reach);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

/** Everyone but the winners washes out toward the floor (then the winners are drawn again on top). */
export function drawWash(ctx: CanvasRenderingContext2D, ending: EndingView, arena: Land, now: number) {
  const alpha = progress(now - ending.startedAt, LOOK.washAtMs, LOOK.washFadeMs) * LOOK.washAlpha;
  if (alpha === 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ARENA_PAINT.floor;
  ctx.fill(landPath(arena));
  ctx.globalAlpha = 1;
}

/** Whether the winners are drawn again over the wash yet. */
export function winnersOnTop(ending: EndingView, now: number): boolean {
  return now - ending.startedAt >= LOOK.washAtMs;
}

/**
 * Each winner's head, big (screen px), dropping onto where they are with a bounce, wearing the crown,
 * spinning round to face us (`winnerHeadAngle`). `toScreen` maps world to CSS px; the context is in CSS px.
 */
export function drawWinnerHeads(ctx: CanvasRenderingContext2D, ending: EndingView, players: readonly PlayerFrame[], toScreen: (p: Point) => Point, now: number) {
  const since = now - ending.startedAt;
  const t = progress(since, LOOK.winnerHeadAtMs, LOOK.winnerHeadDropMs);
  if (t === 0) return;
  const size = LOOK.winnerHeadPx;
  const grow = easeOutBack(t);
  const drop = (1 - t) * size * 2;
  for (const p of players) {
    if (!p.head || !ending.winners.includes(p.id)) continue;
    const at = toScreen(p.head);
    // The head drawn by the world code, scaled so it is `size` px wide.
    const k = (size / (LOOK.headSize * W)) * grow;
    ctx.save();
    ctx.translate(at.x, at.y - drop);
    ctx.scale(k, k);
    ctx.translate(-p.head.x, -p.head.y);
    // Wearing the leader's crown, the same 3D one as in the match.
    drawHeads(ctx, [{ ...p, head: { ...p.head, angle: winnerHeadAngle(p.head.angle, since) } }], undefined, undefined, p.id);
    ctx.restore();
  }
}
