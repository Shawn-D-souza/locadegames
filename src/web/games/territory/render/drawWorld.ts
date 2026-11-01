import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { Land } from "../../../../shared/games/territory/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { EffectView, PlayerFrame } from "../engine/frame";
import { ARENA_PAINT, playerPaint } from "./palette";
import { landPath, outsidePath, polylinePath } from "./paths";

/**
 * Drawing in world units (the camera transform is already set). Order: floor, land, trails, heads,
 * effects, wall. Where a trail crosses someone's raised land it runs at floor level in a trench: the
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

/** The arena: a white raised plate with an ink lip and the dot grid. */
export function drawFloor(ctx: CanvasRenderingContext2D, arena: Land) {
  const path = landPath(arena);
  ctx.save();
  ctx.translate(0, LOOK.wallLip * W);
  ctx.fillStyle = ARENA_PAINT.wall;
  ctx.fill(path);
  ctx.restore();
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
  ctx.lineWidth = Math.max(LOOK.wallWidth * W * 0.25, 3 / pxPerUnit);
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

/** The tops of every land. */
export function drawLandTops(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], arena: Land, pxPerUnit: number) {
  ctx.save();
  ctx.clip(landPath(arena));
  ctx.lineWidth = 1.5 / pxPerUnit;
  ctx.lineJoin = "round";
  for (const p of players) {
    const paint = playerPaint(p.id);
    ctx.fillStyle = paint.land;
    ctx.strokeStyle = paint.land;
    for (const land of p.land) {
      if (!land.length) continue;
      const path = landPath(land);
      ctx.fill(path);
      ctx.stroke(path);
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

function roundedSquare(ctx: CanvasRenderingContext2D, size: number, corner: number) {
  const h = size / 2;
  ctx.beginPath();
  ctx.roundRect(-h, -h, size, size, corner);
}

/** Heads: a rounded block in the player's color with a solid lip, ink outline and eyes looking ahead. */
export function drawHeads(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[]) {
  const size = LOOK.headSize * W;
  const corner = LOOK.headCorner * W;
  for (const p of players) {
    if (!p.head) continue;
    const paint = playerPaint(p.id);
    const { x, y, angle } = p.head;
    ctx.save();
    ctx.translate(x, y + LOOK.headLip * W);
    ctx.rotate(angle);
    roundedSquare(ctx, size, corner);
    ctx.fillStyle = ARENA_PAINT.ink;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    roundedSquare(ctx, size, corner);
    ctx.fillStyle = paint.head;
    ctx.fill();
    ctx.lineWidth = LOOK.outline * W;
    ctx.strokeStyle = ARENA_PAINT.ink;
    ctx.stroke();
    // Eyes on the front half, pupils looking forward.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(size * 0.16, side * size * 0.2, size * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = ARENA_PAINT.white;
      ctx.fill();
      ctx.lineWidth = LOOK.outline * W * 0.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size * 0.22, side * size * 0.2, size * 0.065, 0, Math.PI * 2);
      ctx.fillStyle = ARENA_PAINT.ink;
      ctx.fill();
    }
    ctx.restore();
  }
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** How far (device px) the land overlaps a trench's trail on each side, so their soft edges never let the floor show between them. */
const TRENCH_OVERLAP_PX = 1.5;

/**
 * Cuts every trail out of a land layer (shifted down by `offsetY` for the lips), each clipped like the
 * drawn trail: a trail never cuts its owner's land. Through the cut, the trail shows at floor level.
 */
export function cutTrenches(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], radius: number, offsetY: number, pxPerUnit: number) {
  ctx.save();
  ctx.translate(0, offsetY);
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(0, W - (2 * TRENCH_OVERLAP_PX) / pxPerUnit);
  ctx.strokeStyle = ARENA_PAINT.ink;
  for (const p of players) {
    if (!p.trail || p.trail.length === 0) continue;
    ctx.save();
    if (p.home.length) ctx.clip(outsidePath(p.home, radius * 2), "evenodd");
    ctx.stroke(polylinePath(p.trail));
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


/** New land flashes white; a head that goes out bursts into pieces of its color. */
export function drawEffects(ctx: CanvasRenderingContext2D, effects: readonly EffectView[], now: number) {
  for (const e of effects) {
    if (e.kind === "vanish" || e.kind === "shake") continue;
    const t = (now - e.startedAt) / (e.kind === "flash" ? LOOK.captureFlashMs : LOOK.burstMs);
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
      ctx.translate(e.x + Math.cos(angle) * reach, e.y + Math.sin(angle) * reach + t * t * W * 1.5);
      ctx.rotate(angle + t * 6);
      ctx.fillStyle = i % 2 ? paint.head : paint.lip;
      ctx.fillRect(-piece / 2, -piece / 2, piece, piece);
      ctx.restore();
    }
  }
}
