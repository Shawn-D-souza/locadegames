import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { Land } from "../../../../shared/games/territory/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { EffectView, PlayerFrame } from "../engine/frame";
import { drawHeadAt } from "./drawHeads";
import { RESTING } from "./headMotion";
import type { HeadWake } from "./headWake";
import { ARENA_PAINT, playerPaint } from "./palette";
import { landPattern } from "./landPatterns";
import { landPath, outsidePath, polylinePath } from "./paths";

/**
 * Drawing in world units (the camera transform is already set). Order: floor, land, trails, heads
 * (`drawHeads.ts`), effects, wall. Where a trail crosses someone's raised land it runs at floor level in a trench: the
 * renderer then draws trails first and the land over them with the trails cut out (`cutTrenches`).
 */

const W = TERRITORY_CONFIG.trailWidth;
const LOOK = TERRITORY_CLIENT_CONFIG.look;

let dotPattern: { pattern: CanvasPattern; gap: number } | null = null;

/** The floor's dot grid as a repeating pattern laid out in world units. */
function floorPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const gap = LOOK.floorDotGap * W;
  if (dotPattern?.gap === gap) return dotPattern.pattern;
  const tilePx = 32;
  const tile = document.createElement("canvas");
  tile.width = tile.height = tilePx;
  const t = tile.getContext("2d");
  if (!t) return null;
  t.fillStyle = ARENA_PAINT.floorDot;
  t.beginPath();
  t.arc(tilePx / 2, tilePx / 2, (LOOK.floorDotRadius * W * tilePx) / gap, 0, Math.PI * 2);
  t.fill();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix().scale(gap / tilePx));
  dotPattern = { pattern, gap };
  return pattern;
}

/** The arena: a pale floor with the dot grid (its wall, the same thin line all around, is drawn last). */
export function drawFloor(ctx: CanvasRenderingContext2D, arena: Land) {
  const path = landPath(arena);
  ctx.fillStyle = ARENA_PAINT.floor;
  ctx.fill(path);
  const pattern = floorPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fill(path);
  }
}

/** The wall's ink outline, drawn last so land meets it cleanly. */
export function drawWall(ctx: CanvasRenderingContext2D, arena: Land, pxPerUnit: number) {
  ctx.lineWidth = Math.max(LOOK.wallLine * W, 3 / pxPerUnit);
  ctx.strokeStyle = ARENA_PAINT.wall;
  ctx.lineJoin = "round";
  ctx.stroke(landPath(arena));
}

/**
 * Raised land: every land's solid side (its lip) first, then every top. A top covers the lips of land
 * next to it, so neighbours meet with no gap; a hairline stroke in the same color hides antialiasing seams.
 */
export function drawLands(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], arena: Land, pxPerUnit: number) {
  drawLandLips(ctx, players, arena);
  drawLandTops(ctx, players, arena, pxPerUnit);
}

/** How far a land's solid side shows below its top. */
export const LAND_LIP = LOOK.landLip * W;
/** How thick the light band along a land's top edges is. */
const LAND_EDGE = LOOK.landEdge * W;

/** The solid sides of every land (the land shifted down by the lip). */
export function drawLandLips(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], arena: Land) {
  ctx.save();
  ctx.clip(landPath(arena));
  ctx.translate(0, LAND_LIP);
  for (const p of players) {
    ctx.fillStyle = playerPaint(p.id).lip;
    for (const land of p.land) if (land.length) ctx.fill(landPath(land));
  }
  ctx.restore();
}

/** The tops of every land: their color, a light band along the top edges and the pattern. */
export function drawLandTops(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], arena: Land, pxPerUnit: number) {
  ctx.save();
  ctx.clip(landPath(arena));
  ctx.lineWidth = 1.5 / pxPerUnit;
  ctx.lineJoin = "round";
  for (const p of players) {
    const paint = playerPaint(p.id);
    const pattern = landPattern(ctx, p.id);
    for (const land of p.land) {
      if (!land.length) continue;
      const path = landPath(land);
      // The light edge everywhere, then the land shifted down over it: the band stays only along top edges.
      ctx.fillStyle = paint.landEdge;
      ctx.fill(path);
      ctx.strokeStyle = paint.land;
      ctx.stroke(path);
      ctx.save();
      ctx.clip(path);
      ctx.translate(0, LAND_EDGE);
      ctx.fillStyle = paint.land;
      ctx.fill(path);
      if (pattern) {
        ctx.translate(0, -LAND_EDGE);
        ctx.fillStyle = pattern;
        ctx.fill(path);
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * Trails: the player's color on the edges, lighter inside, round joins (exactly the shape that becomes
 * land). Clipped to outside the owner's land, so a trail visibly starts right at its edge.
 */
export function drawTrails(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], radius: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of players) {
    if (!p.trail || p.trail.length === 0) continue;
    const paint = playerPaint(p.id);
    const path = polylinePath(p.trail);
    ctx.save();
    if (p.home.length) ctx.clip(outsidePath(p.home, radius * 2), "evenodd");
    ctx.strokeStyle = paint.trailEdge;
    ctx.lineWidth = W;
    ctx.stroke(path);
    ctx.strokeStyle = paint.trailInner;
    ctx.lineWidth = W * LOOK.trailInnerShare;
    ctx.stroke(path);
    ctx.restore();
  }
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** How far (device px) the land overlaps a trench's trail on each side, so their soft edges never let the floor show between them. */
const TRENCH_OVERLAP_PX = 1.5;

/**
 * Cuts every trail out of a land layer, once at each of `offsetsY`, each clipped like the drawn trail: a
 * trail never cuts its owner's land. Through the cut, the trail shows at floor level. The tops are also
 * cut one lip higher, so the trench's far wall (the lips) shows beyond the trail, never over it: the trail
 * keeps its full width whichever way it runs.
 */
export function cutTrenches(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], radius: number, offsetsY: readonly number[], pxPerUnit: number) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(0, W - (2 * TRENCH_OVERLAP_PX) / pxPerUnit);
  ctx.strokeStyle = ARENA_PAINT.ink;
  for (const p of players) {
    if (!p.trail || p.trail.length === 0) continue;
    ctx.save();
    if (p.home.length) ctx.clip(outsidePath(p.home, radius * 2), "evenodd");
    const path = polylinePath(p.trail);
    for (const offsetY of offsetsY) {
      ctx.save();
      ctx.translate(0, offsetY);
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Land cut off from its owner fades away, drawn with the land. */
export function drawVanishing(ctx: CanvasRenderingContext2D, effects: readonly EffectView[], now: number) {
  for (const e of effects) {
    if (e.kind !== "vanish") continue;
    const t = (now - e.startedAt) / LOOK.vanishMs;
    if (t < 0 || t >= 1) continue;
    const paint = playerPaint(e.id);
    const path = landPath(e.land);
    ctx.globalAlpha = 1 - easeOut(t);
    ctx.save();
    ctx.translate(0, LAND_LIP * (1 - t));
    ctx.fillStyle = paint.lip;
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = paint.land;
    ctx.fill(path);
    ctx.globalAlpha = 1;
  }
}

const FILL = LOOK.captureFill;
/** How far the color's front has spread (share of the way) at share `t` of the sweep: fast, then slowing. */
const sweepAt = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * Your new land filling in: pale until your color, spreading from where your head got home, reaches it;
 * a light shine just behind the front. Drawn with the land, under trails and heads.
 */
export function drawFills(ctx: CanvasRenderingContext2D, effects: readonly EffectView[], now: number) {
  for (const e of effects) {
    if (e.kind !== "fill") continue;
    const since = now - e.startedAt;
    if (since < 0) continue;
    const t = Math.min(1, Math.max(0, (since - FILL.holdMs) / FILL.sweepMs));
    const front = e.reach * sweepAt(t);
    const afterSweep = (since - FILL.holdMs - FILL.sweepMs) / FILL.fadeMs;
    if (afterSweep >= 1) continue;
    const paint = playerPaint(e.id);
    ctx.save();
    ctx.clip(landPath(e.land));
    if (t < 1) {
      // Pale everywhere the color hasn't reached: the land's box with the color's circle cut out.
      ctx.beginPath();
      ctx.rect(e.x - e.reach, e.y - e.reach, 2 * e.reach, 2 * e.reach);
      if (front > 0) ctx.arc(e.x, e.y, front, 0, Math.PI * 2);
      ctx.fillStyle = paint.landPale;
      ctx.fill("evenodd");
    }
    if (front > 0) {
      // The shine: clear inside, brightest at the front; it fades once the color has spread everywhere.
      const shine = ctx.createRadialGradient(e.x, e.y, Math.max(0, front - FILL.shineBand * W), e.x, e.y, front);
      shine.addColorStop(0, paint.landShineClear);
      shine.addColorStop(1, paint.landShine);
      ctx.globalAlpha = afterSweep > 0 ? 1 - afterSweep : 1;
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(e.x, e.y, front, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

/** The sand heads kick up behind them in their own land: faint puffs and small grains in lighter and darker shades of the land. */
export function drawWake(ctx: CanvasRenderingContext2D, wake: HeadWake, now: number) {
  wake.forEachPuff(now, (id, shade, x, y, size, alpha) => {
    const paint = playerPaint(id);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = shade === "dark" ? paint.wakeGrain : paint.wake;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

const SPIN = LOOK.outSpin;
/** Reused for the spinning head (no garbage per frame). */
const spinning = { ...RESTING };

/**
 * Others' new land flashes white; a head that goes out bursts into pieces of its color. Knocked out, it first spins
 * (faster and faster), pops up and shrinks, then bursts up there.
 */
export function drawEffects(ctx: CanvasRenderingContext2D, effects: readonly EffectView[], now: number) {
  for (const e of effects) {
    if (e.kind === "vanish" || e.kind === "shake" || e.kind === "cheer" || e.kind === "fill") continue;
    let startedAt = e.startedAt;
    let y = e.kind === "burst" ? e.y : 0;
    if (e.kind === "burst" && e.spin) {
      const s = (now - startedAt) / SPIN.ms;
      if (s < 0) continue;
      if (s < 1) {
        const scale = 1 - SPIN.shrink * s;
        // Lifted in the shrunken head's own units, so it rises the full height on screen.
        spinning.lift = (SPIN.lift * W * easeOut(s)) / scale;
        drawHeadAt(ctx, e.id, e.x, e.y, e.angle + SPIN.turns * 2 * Math.PI * s * s, spinning, scale);
        continue;
      }
      startedAt += SPIN.ms;
      y -= SPIN.lift * W;
    }
    const t = (now - startedAt) / (e.kind === "flash" ? LOOK.captureFlashMs : LOOK.burstMs);
    if (t < 0 || t >= 1) continue;
    if (e.kind === "flash") {
      ctx.globalAlpha = LOOK.captureFlashAlpha * (1 - t);
      ctx.fillStyle = ARENA_PAINT.flash;
      ctx.fill(landPath(e.land));
      ctx.globalAlpha = 1;
      continue;
    }
    const paint = playerPaint(e.id);
    const piece = W * 0.45 * (1 - t * 0.6);
    for (let i = 0; i < LOOK.burstPieces; i++) {
      // Evenly spread with a fixed wobble: the same burst every time, no randomness.
      const angle = (i / LOOK.burstPieces) * Math.PI * 2 + (i % 3) * 0.35;
      const reach = LOOK.burstSpread * W * easeOut(t) * (0.6 + (i % 4) * 0.15);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(e.x + Math.cos(angle) * reach, y + Math.sin(angle) * reach + t * t * W * 1.5);
      ctx.rotate(angle + t * 6);
      ctx.fillStyle = i % 2 ? paint.head : paint.lip;
      ctx.fillRect(-piece / 2, -piece / 2, piece, piece);
      ctx.restore();
    }
  }
}
