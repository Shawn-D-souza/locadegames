import { slabsAt } from "../../../../shared/games/headcrash/layout";
import { SURFACE, type Block, type Layout, type Motion, type Surface } from "../../../../shared/games/headcrash/types";
import { mixSeed, seededRandom } from "../../../../shared/games/headcrash/random";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import { ARENA_PAINT } from "./palette";

const LOOK = HEADCRASH_CLIENT_CONFIG.look;

/** Further than any screen shows (meters): the sky, the hills and a cave's rock reach this far. */
const FAR = 200;

/** Pebbles reach this far past the frame (meters): further than a phone held upright shows. */
const PEBBLES_REACH = 70;

/** The world's rectangle a canvas shows (meters). */
export interface WorldRect {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

/** A map's shapes as paths, built once per map. */
export interface WorldPaths {
  /** All the ground, to fill (non-zero): a cave's rock all round its play space, islands, cliffs. */
  ground: Path2D;
  /** The rock's outlines, to stroke. */
  outline: Path2D;
  /** Bounce pads, drawn over the rock in the gadgets' color. */
  pads: Path2D;
  /** Pebbles in the ground. */
  pebbles: Path2D;
}

/** How many times an outline winds round a point (counter-clockwise positive). */
function winding(points: readonly { x: number; y: number }[], x: number, y: number): number {
  let count = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const side = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
    if (a.y <= y && b.y > y && side > 0) count += 1;
    else if (a.y > y && b.y <= y && side < 0) count -= 1;
  }
  return count;
}

/** Whether a point is inside the ground, at least `inset` from its outline. */
function deepInGround(layout: Layout, x: number, y: number, inset: number): boolean {
  // A cave's rock is a huge clockwise square round its counter-clockwise play space; islands run clockwise.
  let total = layout.cave ? -1 : 0;
  layout.outlines.forEach((outline, i) => {
    if (layout.surfaces[i] === SURFACE.rock) total += winding(outline, x, y);
  });
  if (total === 0) return false;
  for (const e of layout.edges) {
    const t = Math.max(0, Math.min(e.length, (x - e.ax) * e.dx + (y - e.ay) * e.dy));
    if (Math.hypot(x - (e.ax + e.dx * t), y - (e.ay + e.dy * t)) < inset) return false;
  }
  return true;
}

export function worldPaths(layout: Layout): WorldPaths {
  const all = new Path2D();
  const bySurface: Record<Surface, Path2D> = { [SURFACE.rock]: new Path2D(), [SURFACE.pad]: new Path2D() };
  layout.outlines.forEach((points, index) => {
    for (const path of [all, bySurface[layout.surfaces[index]!]]) {
      points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
      path.closePath();
    }
  });
  const ground = new Path2D();
  if (layout.cave) {
    // Clockwise, against the play space's counter-clockwise outline: everything but the play space is rock.
    ground.moveTo(-FAR, -FAR);
    ground.lineTo(-FAR, FAR);
    ground.lineTo(FAR, FAR);
    ground.lineTo(FAR, -FAR);
    ground.closePath();
  }
  ground.addPath(all);

  // Pebbles on a jittered grid, the same every time for a map, only where they sit well inside the ground.
  const pebbles = new Path2D();
  const random = seededRandom(mixSeed(layout.name.length, layout.edges.length));
  const [small, big] = LOOK.pebbleSize;
  const gap = LOOK.pebbleGap;
  for (let y = layout.floorY - PEBBLES_REACH; y < layout.topY + PEBBLES_REACH; y += gap) {
    for (let x = layout.minX - PEBBLES_REACH; x < layout.maxX + PEBBLES_REACH; x += gap) {
      const px = x + (random() - 0.5) * gap * 0.8;
      const py = y + (random() - 0.5) * gap * 0.8;
      const r = small + (big - small) * random();
      if (random() < 0.35 || !deepInGround(layout, px, py, r + LOOK.pebbleInset)) continue;
      pebbles.moveTo(px + r, py);
      pebbles.ellipse(px, py, r, r * 0.8, random() * Math.PI, 0, 2 * Math.PI);
    }
  }
  return { ground, outline: bySurface[SURFACE.rock], pads: bySurface[SURFACE.pad], pebbles };
}

/** The sky, soft round hills far behind it and a few clouds (flat, no outline), across all of `rect`. */
function drawSky(ctx: CanvasRenderingContext2D, layout: Layout, rect: WorldRect) {
  ctx.fillStyle = ARENA_PAINT.sky;
  ctx.fillRect(rect.left, rect.bottom, rect.right - rect.left, rect.top - rect.bottom);
  LOOK.hills.forEach((row, i) => {
    // Rounded hills side by side (half ellipses), sizes in a pattern that is the same on both halves of the map.
    const base = layout.floorY + row.base;
    const hills = new Path2D();
    const first = Math.floor(rect.left / row.length) - 1;
    const last = Math.ceil(rect.right / row.length) + 1;
    for (let k = first; k <= last; k++) {
      const size = 0.75 + 0.35 * Math.abs(Math.sin((Math.abs(k) + i) * 1.7));
      const x = (k + (i === 0 ? 0.5 : 0)) * row.length;
      hills.moveTo(x + row.length * 0.75 * size, base);
      hills.ellipse(x, base, row.length * 0.75 * size, row.swell * 1.6 * size, 0, 0, Math.PI);
    }
    hills.rect(rect.left, rect.bottom, rect.right - rect.left, base - rect.bottom);
    ctx.fillStyle = ARENA_PAINT.hills[i]!;
    ctx.fill(hills);
  });
  // Clouds: puffs on a flat bottom, high up in the open sky.
  ctx.fillStyle = ARENA_PAINT.cloud;
  for (const cloud of LOOK.clouds) {
    const x = cloud.x;
    const y = layout.floorY + cloud.y;
    const r = cloud.size;
    const puffs = new Path2D();
    for (const [dx, dy, dr] of [[-1.1, 0, 0.65], [0, 0.35, 1], [1.05, 0.05, 0.7]] as const) {
      puffs.moveTo(x + dx * r + dr * r, y + dy * r);
      puffs.arc(x + dx * r, y + dy * r, dr * r, 0, 2 * Math.PI);
    }
    puffs.rect(x - 1.1 * r, y - 0.65 * r, 2.15 * r, 0.65 * r);
    ctx.save();
    // Flat bottom: nothing below the cloud's base line.
    ctx.beginPath();
    ctx.rect(x - 3 * r, y - 0.3 * r, 6 * r, 4 * r);
    ctx.clip();
    ctx.fill(puffs);
    ctx.restore();
  }
}

/** A fan's grille on the floor: a coral slab with slats. */
function drawFans(ctx: CanvasRenderingContext2D, layout: Layout) {
  ctx.lineWidth = LOOK.groundLine;
  ctx.lineJoin = "round";
  for (const fan of layout.fans) {
    const width = fan.maxX - fan.minX;
    ctx.beginPath();
    ctx.roundRect(fan.minX, fan.minY - LOOK.fanGrille / 2, width, LOOK.fanGrille, LOOK.blockRadius);
    ctx.fillStyle = ARENA_PAINT.gadget;
    ctx.strokeStyle = ARENA_PAINT.ink;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let x = fan.minX + LOOK.fanStreakGap / 2; x < fan.maxX; x += LOOK.fanStreakGap / 2) {
      ctx.moveTo(x, fan.minY - LOOK.fanGrille / 2);
      ctx.lineTo(x, fan.minY + LOOK.fanGrille / 2);
    }
    ctx.stroke();
  }
}

/** A fan's rising air: faint streaks floating up its column, over the sky (they move, so drawn every frame). */
export function drawFanAir(ctx: CanvasRenderingContext2D, layout: Layout, now: number) {
  ctx.strokeStyle = ARENA_PAINT.fanAir;
  ctx.lineWidth = LOOK.groundLine;
  ctx.lineCap = "round";
  for (const fan of layout.fans) {
    const height = fan.maxY - fan.minY;
    ctx.beginPath();
    let column = 0;
    for (let x = fan.minX + LOOK.fanStreakGap / 2; x < fan.maxX; x += LOOK.fanStreakGap, column++) {
      // Each column's streaks start at a different height, so they don't rise in rows.
      const offset = (((now / 1000) * LOOK.fanStreakSpeed + column * 1.7) % 3) / 3;
      for (let y = fan.minY + offset * 3; y < fan.maxY; y += 3) {
        // Fainter (shorter) higher up, where the air is weaker.
        const length = LOOK.fanStreakLength * (1 - (y - fan.minY) / height);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + length);
      }
    }
    ctx.stroke();
  }
}

/** The lifts where they are now: the ground's color with its ink outline, like planks. */
export function drawSlabs(ctx: CanvasRenderingContext2D, layout: Layout, motion: Motion) {
  if (layout.lifts.length > 0) drawBlocks(ctx, slabsAt(layout, motion));
}

/** Floating planks: the ground's color with its ink outline. */
function drawBlocks(ctx: CanvasRenderingContext2D, blocks: readonly Block[]) {
  ctx.lineWidth = LOOK.groundLine;
  ctx.lineJoin = "round";
  for (const block of blocks) {
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate(block.angle);
    ctx.beginPath();
    ctx.roundRect(-block.halfWidth, -block.halfHeight, 2 * block.halfWidth, 2 * block.halfHeight, LOOK.blockRadius);
    ctx.fillStyle = ARENA_PAINT.ground;
    ctx.strokeStyle = ARENA_PAINT.ink;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** Everything in the world that never moves: sky, hills, ground with its pebbles and outline, bounce pads, fans, planks. */
export function drawWorld(ctx: CanvasRenderingContext2D, layout: Layout, paths: WorldPaths, rect: WorldRect) {
  drawSky(ctx, layout, rect);
  ctx.fillStyle = ARENA_PAINT.ground;
  ctx.fill(paths.ground);
  ctx.fillStyle = ARENA_PAINT.pebble;
  ctx.fill(paths.pebbles);
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.groundLine;
  ctx.lineJoin = "round";
  ctx.stroke(paths.outline);
  // Over the rock (a pad is set into the floor; its own outline covers the floor's line across it).
  ctx.fillStyle = ARENA_PAINT.gadget;
  ctx.fill(paths.pads);
  ctx.stroke(paths.pads);
  drawFans(ctx, layout);
  drawBlocks(ctx, layout.blocks);
}

/**
 * The water, in front of everything and across the whole screen: deep blue with a pale wavy band on top. Once it
 * rises the band turns coral and blinks, so nobody is surprised by it.
 */
export function drawWater(ctx: CanvasRenderingContext2D, rect: WorldRect, waterY: number, rising: boolean, now: number) {
  const { waveHeight, waveLength, waveSpeed } = LOOK;
  const shift = (now / 1000) * waveSpeed;
  const step = waveLength / 10;
  const from = Math.floor(rect.left / step) * step;
  const crest = new Path2D();
  for (let x = from; x <= rect.right + step; x += step) {
    const y = waterY + waveHeight * Math.sin(((x + shift) / waveLength) * 2 * Math.PI);
    if (x === from) crest.moveTo(x, y);
    else crest.lineTo(x, y);
  }
  const body = new Path2D(crest);
  body.lineTo(rect.right + step, rect.bottom - 1);
  body.lineTo(from, rect.bottom - 1);
  body.closePath();
  ctx.fillStyle = ARENA_PAINT.water;
  ctx.fill(body);
  const warn = rising && Math.floor(now / LOOK.risingBlinkMs) % 2 === 0;
  ctx.strokeStyle = warn ? ARENA_PAINT.waterRising : ARENA_PAINT.waterCrest;
  ctx.lineWidth = LOOK.crestBand;
  ctx.lineJoin = "round";
  ctx.stroke(crest);
}
