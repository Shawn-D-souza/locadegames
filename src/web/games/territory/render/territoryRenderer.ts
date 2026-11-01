import { arenaPolygon } from "../../../../shared/games/territory/arena";
import { boundsOverlap, landBounds, type Bounds } from "../../../../shared/games/territory/geometry";
import type { Land } from "../../../../shared/games/territory/types";
import type { PlayerId } from "../../../../shared/rooms/types";
import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { layout } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { FrameView, PlayerFrame } from "../engine/frame";
import { Camera } from "./camera";
import { drawRays, drawWash, drawWinnerHeads, shakeOffset, thumpScale, winnersOnTop } from "./drawEnding";
import { drawMinimap, drawMinimapHeads, drawNames } from "./drawOverlay";
import {
  cutTrenches,
  drawEffects,
  drawFloor,
  drawHeads,
  drawLandLips,
  drawLands,
  drawLandTops,
  drawTrails,
  drawVanishing,
  drawWall,
  LAND_LIP,
} from "./drawWorld";
import { ARENA_PAINT } from "./palette";

const HUD = TERRITORY_CLIENT_CONFIG.hud;
const HALF_TRAIL = TERRITORY_CONFIG.trailWidth / 2;

const boundsCache = new WeakMap<Land, Bounds | null>();
function cachedBounds(land: Land): Bounds | null {
  let bounds = boundsCache.get(land);
  if (bounds === undefined) {
    bounds = landBounds(land);
    boundsCache.set(land, bounds);
  }
  return bounds;
}

/** Whether any trail runs over someone else's land (then trails sit in trenches under the land layer). */
function trailsCrossLand(players: readonly PlayerFrame[]): boolean {
  for (const p of players) {
    if (!p.trail?.length) continue;
    const trail = landBounds([p.trail]);
    if (!trail) continue;
    for (const other of players) {
      if (other.id === p.id) continue;
      for (const land of other.land) {
        const bounds = land.length ? cachedBounds(land) : null;
        if (bounds && boundsOverlap(trail, bounds, HALF_TRAIL)) return true;
      }
    }
  }
  return false;
}

/** Draws frames onto the game canvas (Canvas 2D: exact polygons, no extra library). Knows nothing about the network. */
export class TerritoryRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera();
  private readonly minimap = document.createElement("canvas");
  /** Scratch layer for land with trenches cut in it (same size as the canvas). */
  private readonly layer = document.createElement("canvas");
  private minimapAt = -Infinity;
  private arena: { radius: number; land: Land } | null = null;
  private width = 0;
  private height = 0;
  private ratio = 1;
  private lastDrawAt: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
  }

  /** Matches the canvas to its on-screen size (CSS px) at the device's pixel ratio. */
  resize(width: number, height: number, devicePixelRatio: number) {
    this.width = width;
    this.height = height;
    this.ratio = Math.min(devicePixelRatio, TERRITORY_CLIENT_CONFIG.camera.maxPixelRatio);
    this.canvas.width = Math.round(width * this.ratio);
    this.canvas.height = Math.round(height * this.ratio);
    this.layer.width = this.canvas.width;
    this.layer.height = this.canvas.height;
    const mini = Math.round(HUD.minimapPx * this.ratio);
    this.minimap.width = this.minimap.height = mini;
    this.minimapAt = -Infinity;
  }

  /** Draws onto the scratch layer in world units, then copies it onto the canvas. */
  private drawLandLayer(world: readonly [number, number, number, number, number, number], paint: (layer: CanvasRenderingContext2D) => void) {
    const layer = this.layer.getContext("2d");
    if (!layer) return;
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, this.layer.width, this.layer.height);
    layer.setTransform(...world);
    paint(layer);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.layer, 0, 0);
    this.ctx.setTransform(...world);
  }

  draw(frame: FrameView, now: number, names: ReadonlyMap<PlayerId, string>) {
    const { ctx, width, height, ratio, camera } = this;
    if (!width || !height) return;
    if (this.arena?.radius !== frame.radius) this.arena = { radius: frame.radius, land: arenaPolygon(frame.radius) };
    const arena = this.arena.land;
    const elapsed = this.lastDrawAt === null ? 0 : now - this.lastDrawAt;
    this.lastDrawAt = now;
    camera.update(frame.focus, frame.radius, width, height, elapsed);

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = ARENA_PAINT.outside;
    ctx.fillRect(0, 0, width, height);

    // World: camera centered (plus the ending's thump and any shake), world units.
    const ending = frame.ending;
    const scale = camera.scale * thumpScale(ending, now);
    const shake = shakeOffset(frame.effects, now);
    const pxPerUnit = scale * ratio;
    const originX = (width / 2 + shake.x - camera.x * scale) * ratio;
    const originY = (height / 2 + shake.y - camera.y * scale) * ratio;
    const world = [pxPerUnit, 0, 0, pxPerUnit, originX, originY] as const;
    ctx.setTransform(...world);
    if (ending) drawRays(ctx, ending, frame.radius, now);
    drawFloor(ctx, arena);
    if (trailsCrossLand(frame.players)) {
      // Trails at floor level, then the land over them with each trail cut out: lips, then tops.
      drawTrails(ctx, frame.players, frame.radius);
      this.drawLandLayer(world, (layer) => {
        drawLandLips(layer, frame.players, arena);
        cutTrenches(layer, frame.players, frame.radius, LAND_LIP, pxPerUnit);
      });
      this.drawLandLayer(world, (layer) => {
        drawLandTops(layer, frame.players, arena, pxPerUnit);
        cutTrenches(layer, frame.players, frame.radius, 0, pxPerUnit);
      });
      drawVanishing(ctx, frame.effects, now);
    } else {
      drawLands(ctx, frame.players, arena, pxPerUnit);
      drawVanishing(ctx, frame.effects, now);
      drawTrails(ctx, frame.players, frame.radius);
    }
    drawHeads(ctx, frame.players);
    if (ending) {
      // Everyone washes out; the winners come back on top.
      drawWash(ctx, ending, arena, now);
      if (winnersOnTop(ending, now)) {
        const winners = frame.players.filter((p) => ending.winners.includes(p.id));
        drawLands(ctx, winners, arena, pxPerUnit);
        drawTrails(ctx, winners, frame.radius);
        drawHeads(ctx, winners);
      }
    }
    drawEffects(ctx, frame.effects, now);
    drawWall(ctx, arena, pxPerUnit);

    // Screen: names, minimap (redrawn a few times a second, copied every frame).
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!ending) drawNames(ctx, frame, camera, names, width, height);
    if (ending) drawWinnerHeads(ctx, ending, frame.players, (p) => ({ x: originX / ratio + p.x * scale, y: originY / ratio + p.y * scale }), now);
    if (frame.focus && !ending) {
      if (now - this.minimapAt >= HUD.minimapRefreshMs) {
        const mini = this.minimap.getContext("2d");
        if (mini) {
          mini.setTransform(ratio, 0, 0, ratio, 0, 0);
          mini.clearRect(0, 0, HUD.minimapPx, HUD.minimapPx);
          drawMinimap(mini, frame, arena, HUD.minimapPx);
        }
        this.minimapAt = now;
      }
      const top = height - layout.gutter - HUD.minimapPx;
      ctx.drawImage(this.minimap, layout.gutter, top, HUD.minimapPx, HUD.minimapPx);
      drawMinimapHeads(ctx, frame, layout.gutter, top, HUD.minimapPx);
    }
  }
}
