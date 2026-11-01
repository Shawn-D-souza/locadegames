import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { Land } from "../../../../shared/games/territory/types";
import type { PlayerId } from "../../../../shared/rooms/types";
import { fonts, fontWeights } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { FrameView } from "../engine/frame";
import type { Camera } from "./camera";
import { ARENA_PAINT, playerPaint } from "./palette";
import { landPath } from "./paths";

const { minimapMargin: MINIMAP_MARGIN, minimapFloorAlpha: MINIMAP_FLOOR_ALPHA, minimapHeadPx: MINIMAP_HEAD_PX } = TERRITORY_CLIENT_CONFIG.hud;

/** Drawing in screen pixels (CSS px; the device pixel ratio is already applied): names, the minimap. */

const LOOK = TERRITORY_CLIENT_CONFIG.look;
const W = TERRITORY_CONFIG.trailWidth;

/** Name tags over everyone else's head: a white pill with an ink outline. */
export function drawNames(
  ctx: CanvasRenderingContext2D,
  frame: FrameView,
  camera: Camera,
  names: ReadonlyMap<PlayerId, string>,
  width: number,
  height: number,
) {
  ctx.font = `${fontWeights.bold} ${LOOK.nameFontPx}px ${fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of frame.players) {
    if (!p.head || p.isMe) continue;
    const name = names.get(p.id);
    if (!name) continue;
    const at = camera.toScreen(p.head, width, height);
    const y = at.y - (LOOK.headSize * W * camera.scale) / 2 - LOOK.nameGapPx - LOOK.nameFontPx / 2;
    const textWidth = ctx.measureText(name).width;
    const padX = 6;
    const h = LOOK.nameFontPx + 8;
    ctx.beginPath();
    ctx.roundRect(at.x - textWidth / 2 - padX, y - h / 2, textWidth + padX * 2, h, h / 2);
    ctx.fillStyle = ARENA_PAINT.nameTag;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = playerPaint(p.id).land;
    ctx.stroke();
    ctx.fillStyle = ARENA_PAINT.ink;
    ctx.fillText(name, at.x, y + 0.5);
  }
}

/** CSS px per world unit on the minimap. */
function minimapScale(radius: number, sizePx: number): number {
  return sizePx / (2 * radius * MINIMAP_MARGIN);
}

/** The minimap's map: the arena and every land (redrawn a few times a second; heads go on top every frame). */
export function drawMinimap(ctx: CanvasRenderingContext2D, frame: FrameView, arena: Land, sizePx: number) {
  const scale = minimapScale(frame.radius, sizePx);
  ctx.save();
  ctx.translate(sizePx / 2, sizePx / 2);
  ctx.scale(scale, scale);
  const arenaPath = landPath(arena);
  ctx.globalAlpha = MINIMAP_FLOOR_ALPHA;
  ctx.fillStyle = ARENA_PAINT.floor;
  ctx.fill(arenaPath);
  ctx.globalAlpha = 1;
  for (const p of frame.players) {
    ctx.fillStyle = playerPaint(p.id).land;
    for (const land of p.land) if (land.length) ctx.fill(landPath(land));
  }
  ctx.lineWidth = 2 / scale;
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.stroke(arenaPath);
  ctx.restore();
}

/**
 * Everyone on the minimap, every frame (so they glide, never jump): a tiny copy of each head, a rounded
 * block in the player's color with an ink outline and lip, turned the way it goes. Yours is bigger and on top.
 */
export function drawMinimapHeads(ctx: CanvasRenderingContext2D, frame: FrameView, left: number, top: number, sizePx: number) {
  const scale = minimapScale(frame.radius, sizePx);
  const heads = [...frame.players].sort((a, b) => Number(a.isMe) - Number(b.isMe));
  for (const p of heads) {
    if (!p.head) continue;
    const size = p.isMe ? MINIMAP_HEAD_PX.me : MINIMAP_HEAD_PX.other;
    const paint = playerPaint(p.id);
    ctx.save();
    ctx.translate(left + sizePx / 2 + p.head.x * scale, top + sizePx / 2 + p.head.y * scale);
    ctx.fillStyle = ARENA_PAINT.ink;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2 + MINIMAP_HEAD_PX.lip, size, size, size * MINIMAP_HEAD_PX.cornerShare);
    ctx.fill();
    ctx.rotate(p.head.angle);
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, size * MINIMAP_HEAD_PX.cornerShare);
    ctx.fillStyle = paint.head;
    ctx.fill();
    ctx.lineWidth = MINIMAP_HEAD_PX.outline;
    ctx.strokeStyle = ARENA_PAINT.ink;
    ctx.stroke();
    ctx.restore();
  }
}
