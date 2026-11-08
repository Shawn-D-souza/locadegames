import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { PlayerId } from "../../../../shared/rooms/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { PlayerFrame } from "../engine/frame";
import { CROWN_HEIGHT, drawCrownBack, drawCrownFront } from "./drawCrown";
import { headAtWall } from "./headAtWall";
import { RESTING, type HeadMotion, type HeadStance } from "./headMotion";
import { ARENA_PAINT, playerPaint, type PlayerPaint } from "./palette";

/**
 * Heads: a soft cube faked in 3D, turning with its heading, seen from above at an angle. The top is
 * squashed top to bottom; every side facing us is its own face, shaded by which way it points (light from
 * the upper left), so as the cube turns its sides turn through the light; a flat shadow on the ground.
 * Front and back read from any angle by a crest: a tuft of feathers standing up from the back of the top;
 * the eyes are on the front face, low: full when it heads toward us, a sliver sideways, hidden from behind.
 * The cube stands on its spot: its bottom sits where the head is (the trail runs in under it) and its top
 * is raised one side's height. Hopping for joy, it lifts off its shadow (the shadow shrinks); a knockout's
 * spin turns it as if its heading turned. The leader in land wears a 3D crown on the middle of its top
 * (`drawCrown.ts`) in place of its crest. One soft outline in a dark shade of its own color around the whole cube and
 * the feathers (no ink lines, none between top and sides). Flat colors only; the bottom's width is the
 * head's solid disc, so heads still touch where they're drawn.
 */

const W = TERRITORY_CONFIG.trailWidth;
const LOOK = TERRITORY_CLIENT_CONFIG.look;
const HEAD = LOOK.head;
const SIZE = LOOK.headSize * W;
const HALF = SIZE / 2;
const CORNER = HEAD.corner * W;
const INNER = HALF - CORNER;
const SIDE = HEAD.side * W;
/** The top seen at an angle: squashed top to bottom. */
const TILT = HEAD.tilt;
const MOTION = LOOK.headMotion;

/** How far above its spot the drawn head reaches, crest included (world units): name tags go above it. */
export const HEAD_REACH_UP = SIDE + TILT * HALF + HEAD.crest.height * SIZE * Math.max(...HEAD.crest.feathers.map(([, height]) => height));

/** The crown's outline, as a share of the head's (its parts are small). */
const CROWN_OUTLINE = LOOK.crown.outline;
/** How far above its spot the leader's crown reaches (world units): the leader's name tag goes above it. */
export const CROWN_REACH_UP = SIDE + CROWN_HEIGHT;

/** The top's outline as points around its center (heading along +x), made once. */
const OUTLINE: readonly (readonly [number, number])[] = (() => {
  const points: [number, number][] = [];
  const corners = [
    [INNER, INNER, 0],
    [-INNER, INNER, Math.PI / 2],
    [-INNER, -INNER, Math.PI],
    [INNER, -INNER, (3 * Math.PI) / 2],
  ] as const;
  for (const [cx, cy, from] of corners) {
    for (let i = 0; i <= HEAD.cornerPoints; i++) {
      const a = from + (i / HEAD.cornerPoints) * (Math.PI / 2);
      points.push([cx + CORNER * Math.cos(a), cy + CORNER * Math.sin(a)]);
    }
  }
  return points;
})();

/** Each outline segment's outward normal (segment i runs from point i to i + 1), made once. */
const NORMALS: readonly (readonly [number, number])[] = OUTLINE.map((a, i) => {
  const b = OUTLINE[(i + 1) % OUTLINE.length] ?? a;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let nx = (b[1] - a[1]) / length;
  let ny = -(b[0] - a[0]) / length;
  if (nx * (a[0] + b[0]) + ny * (a[1] + b[1]) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
});

/** Where the light comes from: up and to the left (faces pointing down-left are lit). */
const LIGHT = (() => {
  const length = Math.hypot(HEAD.light[0], HEAD.light[1]);
  return [HEAD.light[0] / length, HEAD.light[1] / length] as const;
})();

/** Reused every frame (no garbage for the phone to collect): the top's points on screen, its copy at the bottom, both, their hull. */
const turned: [number, number][] = OUTLINE.map(() => [0, 0]);
const lowered: [number, number][] = OUTLINE.map(() => [0, 0]);
const both: [number, number][] = [];
const hull: [number, number][] = [];

/**
 * Draws every head. Given the arena's radius, a head at the wall is drawn just inside it (`headAtWall`);
 * given the heads' motion, the eyes look into the turn and blink, and heads hop for joy; the leader wears a crown.
 */
export function drawHeads(ctx: CanvasRenderingContext2D, players: readonly PlayerFrame[], radius?: number, motion?: HeadMotion, leader?: PlayerId | null) {
  for (const p of players) {
    if (!p.head) continue;
    const stance = motion?.stance(p.id) ?? RESTING;
    const pose = stance.spin ? { x: p.head.x, y: p.head.y, angle: p.head.angle + stance.spin } : p.head;
    const { x, y, angle } = radius === undefined ? pose : headAtWall(pose, radius, stance.lift);
    drawHead(ctx, p.id, x, y, angle, stance, p.id === leader);
  }
}

/** One head, `scale` times its size around its spot (a head that's out, spinning away before it bursts). */
export function drawHeadAt(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, angle: number, stance: Readonly<HeadStance>, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawHead(ctx, id, 0, 0, angle, stance, false);
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, angle: number, stance: Readonly<HeadStance>, crowned: boolean) {
  const paint = playerPaint(id);
  const outline = HEAD.outline * W;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // The shadow on the ground, under the cube's bottom: smaller and fainter while it's hopping.
  const shadow = Math.max(0, 1 - (MOTION.shadowShrink * stance.lift) / SIZE);
  ctx.globalAlpha = shadow;
  ctx.fillStyle = ARENA_PAINT.headShadow;
  ctx.beginPath();
  ctx.ellipse(x, y + HALF * HEAD.shadowDrop, HALF * HEAD.shadowWidth * shadow, HALF * HEAD.shadowHeight * shadow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // From here on, (x, top) is the center of the cube's raised top (lifted by any hop).
  const bottom = y - stance.lift;
  const top = bottom - SIDE;
  place(x, top, x, bottom, cos, sin);

  // The sides facing us, each its own face, shaded by which way it points (so turning shows them turn).
  ctx.lineJoin = "round";
  ctx.lineWidth = HEAD.seam * W;
  for (let i = 0; i < OUTLINE.length; i++) {
    const [lx, ly] = NORMALS[i] ?? [0, 0];
    const nx = lx * cos - ly * sin;
    const ny = lx * sin + ly * cos;
    if (ny <= 0) continue;
    const a = turned[i];
    const b = turned[(i + 1) % OUTLINE.length];
    if (!a || !b) continue;
    const lit = Math.max(0, Math.min(1, 0.5 + 0.5 * (nx * LIGHT[0] + ny * LIGHT[1])));
    const shade = paint.headSides[Math.round(lit * (paint.headSides.length - 1))] ?? paint.head;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    const below = lowered[(i + 1) % OUTLINE.length];
    const belowA = lowered[i];
    if (below && belowA) {
      ctx.lineTo(below[0], below[1]);
      ctx.lineTo(belowA[0], belowA[1]);
    }
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.strokeStyle = shade;
    ctx.fill();
    ctx.stroke();
  }

  // The whole cube's soft outline, in a dark shade of its own color.
  ctx.beginPath();
  for (const [px, py] of hull) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.lineWidth = outline;
  ctx.strokeStyle = paint.headOutline;
  ctx.stroke();

  // The top, seen at an angle: a light band along its top edges, then its color. No ink line between the
  // top and the sides: they meet by shading only, like a smooth cube.
  ctx.beginPath();
  for (const [px, py] of turned) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fillStyle = paint.headEdge;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(0, HEAD.edge * W);
  ctx.fillStyle = paint.head;
  ctx.fill();
  ctx.restore();

  // Crowned, the crown takes the crest's place (both together were too busy): its inside and far points, then its band and near points.
  if (crowned) drawCrownBack(ctx, paint, x, top, angle, outline * CROWN_OUTLINE);
  else drawCrest(ctx, paint, x, top, cos, sin, outline);
  if (sin > 0) drawEyes(ctx, x, top, cos, sin, stance);
  if (crowned) drawCrownFront(ctx, x, top, angle, outline * CROWN_OUTLINE);
}

/**
 * The crest: a tuft of feathers standing up from the back of the top and leaning back, so front and back
 * read from any angle (it rises above the cube even when the eyes are hidden). Each feather is a soft
 * teardrop in the player's color with a lighter middle and the cube's soft outline.
 */
function drawCrest(ctx: CanvasRenderingContext2D, paint: PlayerPaint, x: number, y: number, cos: number, sin: number, outline: number) {
  const c = HEAD.crest;
  // On screen: the head's back and its side, as seen on the tilted top.
  const backX = -cos;
  const backY = -sin * TILT;
  const sideX = -sin;
  const sideY = cos * TILT;
  const baseX = x + backX * c.at * SIZE;
  const baseY = y + backY * c.at * SIZE;
  ctx.lineJoin = "round";
  for (const [spread, height] of c.feathers) {
    const fromX = baseX + sideX * spread * c.base * SIZE;
    const fromY = baseY + sideY * spread * c.base * SIZE;
    const tipX = fromX + (backX * c.lean + sideX * spread * c.fan) * SIZE;
    // Leaning toward or away from us shows little on screen (it's mostly depth), so the crest keeps its height.
    const tipY = fromY - height * c.height * SIZE + (backY * c.lean * c.leanDepth + sideY * spread * c.fan) * SIZE;
    featherShape(ctx, fromX, fromY, tipX, tipY, c.width * SIZE);
    ctx.fillStyle = paint.crest;
    ctx.fill();
    ctx.lineWidth = outline;
    ctx.strokeStyle = paint.headOutline;
    ctx.stroke();
    featherShape(ctx, fromX, fromY, tipX, tipY, c.width * SIZE * c.shine);
    ctx.fillStyle = paint.crestShine;
    ctx.fill();
  }
}

/** A plump teardrop from a narrow base to a rounded tip, widest toward the tip. */
function featherShape(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, tipX: number, tipY: number, width: number) {
  const dx = tipX - fromX;
  const dy = tipY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const px = (-dy / length) * width;
  const py = (dx / length) * width;
  const midX = fromX + dx * 0.7;
  const midY = fromY + dy * 0.7;
  ctx.beginPath();
  ctx.moveTo(fromX + px * 0.3, fromY + py * 0.3);
  ctx.bezierCurveTo(midX + px * 1.2, midY + py * 1.2, tipX + px * 0.6, tipY + py * 0.6, tipX, tipY);
  ctx.bezierCurveTo(tipX - px * 0.6, tipY - py * 0.6, midX - px * 1.2, midY - py * 1.2, fromX - px * 0.3, fromY - py * 0.3);
  ctx.closePath();
}

/**
 * The eyes, low on the front face and drawn onto it (so they turn with it): full when the head comes
 * toward us, a sliver sideways. The pupils look a little into the turn; a blink shuts them to a line.
 */
function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, cos: number, sin: number, stance: Readonly<HeadStance>) {
  // The front face's top edge on screen, from its right end (as seen by the head) to its left.
  const ax = x + HALF * cos + INNER * sin;
  const ay = y + TILT * (HALF * sin - INNER * cos);
  const bx = x + HALF * cos - INNER * sin;
  const by = y + TILT * (HALF * sin + INNER * cos);
  const across = 2 * INNER;
  const ru = (HEAD.eyeSize * SIZE) / across;
  const open = 1 - stance.blink * HEAD.blinkShut;
  const rv = ((HEAD.eyeSize * SIZE) / SIDE) * open;
  const ring = (HEAD.eyeRing * W) / across;
  ctx.save();
  // Unit square on the face: u along its top edge, v down its height.
  ctx.transform(ax - bx, ay - by, 0, SIDE, bx, by);
  for (const side of [-1, 1]) {
    const u = 0.5 + side * HEAD.eyeApart;
    const v = HEAD.eyeLow;
    ctx.beginPath();
    ctx.ellipse(u, v, ru + ring, rv + ring * (across / SIDE), 0, 0, Math.PI * 2);
    ctx.fillStyle = ARENA_PAINT.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(u, v, ru, rv, 0, 0, Math.PI * 2);
    ctx.fillStyle = ARENA_PAINT.white;
    ctx.fill();
    if (stance.blink > HEAD.blinkPupilGone) continue;
    ctx.beginPath();
    ctx.ellipse(u - stance.turn * HEAD.lookAside * ru, v + HEAD.pupilDown * rv, ru * HEAD.pupilShare, rv * HEAD.pupilShare, 0, 0, Math.PI * 2);
    ctx.fillStyle = ARENA_PAINT.ink;
    ctx.fill();
  }
  ctx.restore();
}

/** Puts the top's outline on screen around (x, y) (turned, then tilted away from us), its copy around the bottom at (bottomX, bottomY), and their hull. */
function place(x: number, y: number, bottomX: number, bottomY: number, cos: number, sin: number) {
  both.length = 0;
  for (let i = 0; i < OUTLINE.length; i++) {
    const [ox, oy] = OUTLINE[i] ?? [0, 0];
    const point = turned[i] ?? [0, 0];
    const below = lowered[i] ?? [0, 0];
    const sx = ox * cos - oy * sin;
    const sy = TILT * (ox * sin + oy * cos);
    point[0] = x + sx;
    point[1] = y + sy;
    below[0] = bottomX + sx;
    below[1] = bottomY + sy;
    both.push(point, below);
  }
  convexHull(both, hull);
}

/** Andrew's monotone chain: the convex hull of `points` into `out`, counter-clockwise. */
function convexHull(points: [number, number][], out: [number, number][]) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  out.length = 0;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (const p of points) {
    while (out.length >= 2 && cross(out[out.length - 2] as [number, number], out[out.length - 1] as [number, number], p) <= 0) out.pop();
    out.push(p);
  }
  const lower = out.length + 1;
  for (let i = points.length - 2; i >= 0; i--) {
    const p = points[i] as [number, number];
    while (out.length >= lower && cross(out[out.length - 2] as [number, number], out[out.length - 1] as [number, number], p) <= 0) out.pop();
    out.push(p);
  }
  out.pop();
}
