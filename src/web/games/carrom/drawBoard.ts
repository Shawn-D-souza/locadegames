import { POCKETS, sideFrame, strikerSpot } from "../../../shared/games/carrom/board";
import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import type { CarromSide, CoinKind } from "../../../shared/games/carrom/types";
import { CARROM_LOOK, CARROM_PAINT } from "./look";

const S = CARROM_CONFIG.board.size;
const MID = S / 2;
const { frame: F, frameRound, baselineGap, centreRing, outerRing, arrowFrom, arrowTo, arrowHead, groove } = CARROM_LOOK;
const HALF = CARROM_CONFIG.baseline.half;
const SIDES: readonly CarromSide[] = [0, 1, 2, 3];

/** A disc as it is drawn now: where, what it is, and how big (sinking into a hole, popping back, leaving). */
export interface DrawDisc {
  x: number;
  y: number;
  kind: CoinKind | "striker";
  /** 1 as normal. */
  scale: number;
}

/**
 * The board, in board units (the canvas already turned and scaled): a wood frame outlined in ink round a pale birch
 * surface, the four holes, each side's baseline (two lines a striker apart with a circle at each end), the two rings in
 * the middle and an arrow from each corner. Flat colors, no shine (DESIGN.md). `px`: one screen pixel in board units.
 */
export function drawBoard(ctx: CanvasRenderingContext2D, px: number) {
  ctx.fillStyle = CARROM_PAINT.frame;
  ctx.strokeStyle = CARROM_PAINT.frameEdge;
  ctx.lineWidth = CARROM_PAINT.outlineWidth * px;
  ctx.beginPath();
  // Inset by half the outline, so all of it shows inside the canvas.
  ctx.roundRect(-F + px, -F + px, S + 2 * F - 2 * px, S + 2 * F - 2 * px, F * frameRound);
  ctx.fill();
  ctx.stroke();
  // The surface's corners curve round the holes exactly (owner direction: no corner of it left past a hole).
  ctx.fillStyle = CARROM_PAINT.board;
  ctx.beginPath();
  ctx.roundRect(0, 0, S, S, CARROM_CONFIG.pocket.inset);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = CARROM_PAINT.line;
  ctx.lineWidth = CARROM_PAINT.outlineWidth * px * 0.75;
  for (const side of SIDES) {
    const { forward } = sideFrame(side);
    for (const off of [-baselineGap, baselineGap]) {
      const a = strikerSpot(side, -HALF);
      const b = strikerSpot(side, HALF);
      ctx.beginPath();
      ctx.moveTo(a.x + forward.x * off, a.y + forward.y * off);
      ctx.lineTo(b.x + forward.x * off, b.y + forward.y * off);
      ctx.stroke();
    }
    for (const end of [-HALF, HALF]) {
      const c = strikerSpot(side, end);
      ctx.beginPath();
      ctx.arc(c.x, c.y, baselineGap, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for (const r of [centreRing, outerRing]) {
    ctx.beginPath();
    ctx.arc(MID, MID, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // From each corner toward the middle: a line, a small ring at its inner end, an arrowhead pointing into the corner.
  for (const [cx, cy] of [
    [0, 0],
    [S, 0],
    [0, S],
    [S, S],
  ] as const) {
    const ux = (MID - cx) / (Math.SQRT2 * MID);
    const uy = (MID - cy) / (Math.SQRT2 * MID);
    const from = { x: cx + ux * arrowFrom, y: cy + uy * arrowFrom };
    const to = { x: cx + ux * arrowTo, y: cy + uy * arrowTo };
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.moveTo(from.x + (ux - uy) * arrowHead, from.y + (uy + ux) * arrowHead);
    ctx.lineTo(from.x, from.y);
    ctx.lineTo(from.x + (ux + uy) * arrowHead, from.y + (uy - ux) * arrowHead);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x + ux * arrowHead, to.y + uy * arrowHead, arrowHead, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The holes just as the physics has them: a disc whose middle is over one has dropped.
  ctx.fillStyle = CARROM_PAINT.pocket;
  for (const hole of POCKETS) {
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

const FILL: Record<CoinKind, string> = { white: CARROM_PAINT.white, black: CARROM_PAINT.black, queen: CARROM_PAINT.queen };

/** The discs: flat, outlined in ink, each with a groove ring; the striker bigger, in its shooter's color. */
export function drawDiscs(ctx: CanvasRenderingContext2D, discs: readonly DrawDisc[], strikerColor: string, px: number) {
  for (const disc of discs) {
    if (disc.scale <= 0) continue;
    const striker = disc.kind === "striker";
    const r = (striker ? CARROM_CONFIG.strikerRadius : CARROM_CONFIG.coinRadius) * disc.scale;
    ctx.fillStyle = striker ? strikerColor : FILL[disc.kind as CoinKind];
    ctx.strokeStyle = CARROM_PAINT.outline;
    ctx.lineWidth = CARROM_PAINT.outlineWidth * px;
    ctx.beginPath();
    ctx.arc(disc.x, disc.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = disc.kind === "black" || striker ? CARROM_PAINT.grooveOnDark : CARROM_PAINT.groove;
    ctx.globalAlpha = CARROM_PAINT.grooveOpacity;
    ctx.lineWidth = CARROM_PAINT.outlineWidth * px * 0.6;
    ctx.beginPath();
    ctx.arc(disc.x, disc.y, r * groove, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * Only while you pull the striker back (owner direction): a see-through band in your color behind it, toward your
 * finger (the opposite way to the shot; nothing ever in front of it), widest where it leaves the striker and narrowing
 * to a point, as long as the pull (`power` 0 … 1). No outline, no arrowhead: the pull stretching, not a pointer. Drawn
 * under the discs, so the striker covers where it starts.
 */
export function drawPullBand(ctx: CanvasRenderingContext2D, striker: { x: number; y: number }, aim: { dx: number; dy: number }, power: number, color: string) {
  const R = CARROM_CONFIG.strikerRadius;
  const half = R * CARROM_LOOK.pullBandWidth;
  const length = R + CARROM_LOOK.pullBandLength * power;
  // Back along the shot, and across it.
  const bx = -aim.dx;
  const by = -aim.dy;
  ctx.globalAlpha = CARROM_PAINT.pullBandOpacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(striker.x - by * half, striker.y + bx * half);
  ctx.lineTo(striker.x + bx * length, striker.y + by * length);
  ctx.lineTo(striker.x + by * half, striker.y - bx * half);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
