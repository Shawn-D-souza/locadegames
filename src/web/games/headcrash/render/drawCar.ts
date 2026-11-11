import { HEADCRASH_CONFIG } from "../../../../shared/games/headcrash/config";
import { restSink } from "../../../../shared/games/headcrash/layout";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import { ARENA_PAINT, type CarPaint } from "./palette";

const CAR = HEADCRASH_CONFIG.car;
const LOOK = HEADCRASH_CLIENT_CONFIG.look;
const DAZE = LOOK.daze;

/** How far a wheel's spring is squeezed with the car standing still (meters): where the drawing's wheels sit. */
export const WHEEL_REST = restSink();

/**
 * The car's shape: an open-top cartoon roadster facing right, in meters around the car's middle (y up): a chunky tub
 * with a hood sloping down to a rounded nose, a tall windscreen right in front of the driver's face and a low flat
 * back deck behind them. Its wheels are the physics' wheels, drawn where their tyres meet the ground (up by their
 * springs' squeeze), so standing still their tops tuck under the fenders and on a hard landing they push up into them; in the
 * air they hang clear. The body covers the physics' solid shape (so two cars touch where they look like they touch).
 */
const SHAPE = (() => {
  const front = CAR.bodyX + CAR.bodyRadius + 0.1;
  const rear = -(CAR.bodyX + CAR.bodyRadius + 0.08);
  /** The arches: round, a little bigger than a wheel, around where a wheel hangs in the air (a hair higher). */
  const wheelY = CAR.wheelY + 0.02;
  const arch = CAR.wheelRadius + 0.06;
  /** The underside between the wheels: down at the bottom of the solid shape. */
  const sill = CAR.bodyY - CAR.bodyRadius + 0.06;
  const sillReach = Math.sqrt(arch * arch - (sill - wheelY) ** 2);
  const rise = (x: number) => Math.sqrt(arch * arch - (x - CAR.wheelX) ** 2);
  return {
    front,
    rear,
    wheelY,
    arch,
    sill,
    sillX: CAR.wheelX - sillReach,
    sillAngle: Math.atan2(sill - wheelY, sillReach),
    frontY: wheelY + rise(front),
    frontAngle: Math.atan2(rise(front), front - CAR.wheelX),
    rearY: wheelY + rise(-rear),
    rearAngle: Math.atan2(rise(-rear), -rear - CAR.wheelX),
    /** Heights: the back deck, the cockpit's edge (the driver's shoulders show above it), the hood at the windscreen and at the nose. */
    deck: 0.5,
    lip: 0.44,
    hood: 0.56,
    nose: 0.42,
    /** Where the cockpit ends and the hood starts, and where the windscreen stands on the hood (well ahead of the helmet). */
    cockpitFront: 0.38,
    windscreen: 0.54,
  };
})();

/**
 * The body's outline, facing right: from the tail along a low flat back deck to the cockpit (the driver sits in the
 * open, nothing behind the helmet; owner, 2026-11-11), over the hood to the nose, then the arches and the underside.
 */
const BODY = (() => {
  const s = SHAPE;
  const path = new Path2D();
  path.moveTo(s.rear, s.rearY);
  path.arcTo(s.rear, s.deck, s.rear + 0.3, s.deck, 0.2);
  path.lineTo(-0.42, s.deck);
  path.lineTo(-0.36, s.lip);
  path.lineTo(s.cockpitFront, s.lip);
  path.lineTo(s.cockpitFront + 0.08, s.hood);
  // The hood: sloping gently down to a rounded nose.
  path.lineTo(s.front - 0.3, s.nose + 0.02);
  path.arcTo(s.front, s.nose - 0.02, s.front, s.frontY, 0.24);
  path.lineTo(s.front, s.frontY);
  path.arc(CAR.wheelX, s.wheelY, s.arch, s.frontAngle, Math.PI - s.sillAngle);
  path.lineTo(-s.sillX, s.sill);
  path.arc(-CAR.wheelX, s.wheelY, s.arch, s.sillAngle, Math.PI - s.rearAngle);
  path.closePath();
  return path;
})();

/** The racing stripe along the side, from the tail to the nose (clipped to the body). */
const STRIPE = (() => {
  const s = SHAPE;
  const path = new Path2D();
  path.moveTo(s.rear - 0.1, 0.36);
  path.lineTo(s.front + 0.1, 0.27);
  path.lineTo(s.front + 0.1, 0.18);
  path.lineTo(s.rear - 0.1, 0.27);
  path.closePath();
  return path;
})();

/**
 * The windscreen: a tall pane standing on the hood well ahead of the driver's face, leaning back, its top up near
 * the helmet's top third. Its foot sits a little into the hood (the body's outline covers it).
 */
const WINDSCREEN = (() => {
  const s = SHAPE;
  const top = CAR.headY + 0.15;
  const x = s.windscreen;
  const path = new Path2D();
  path.moveTo(x, s.hood - 0.06);
  path.lineTo(x + 0.17, s.hood - 0.08);
  path.arcTo(x + 0.11, top + 0.02, x - 0.02, top, 0.05);
  path.arcTo(x - 0.02, top, x, s.hood - 0.06, 0.04);
  path.closePath();
  return path;
})();

/** The driver's shoulders, in the cockpit under the helmet (the body hides the rest). */
const SHOULDERS = { x: -0.32, y: 0.3, width: 0.56, height: 0.3, radius: 0.13 };

/**
 * A tire, its rim in the car's color with a darker hub, and lug dots that turn with it (they read as spinning even
 * when small). `squeeze`: how far its spring has pushed it up from where it hangs in the air.
 */
function wheel(ctx: CanvasRenderingContext2D, paint: CarPaint, x: number, squeeze: number, turn: number) {
  const rim = CAR.wheelRadius * LOOK.rim;
  ctx.save();
  ctx.translate(x, CAR.wheelY + squeeze);
  ctx.beginPath();
  ctx.arc(0, 0, CAR.wheelRadius, 0, 2 * Math.PI);
  ctx.fillStyle = ARENA_PAINT.tire;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, rim, 0, 2 * Math.PI);
  ctx.fillStyle = paint.body;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, rim * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = paint.bodyLow;
  ctx.fill();
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.7;
  ctx.stroke();
  ctx.rotate(turn);
  ctx.fillStyle = ARENA_PAINT.white;
  ctx.beginPath();
  for (let i = 0; i < LOOK.lugs; i++) {
    const angle = (i / LOOK.lugs) * 2 * Math.PI;
    const lugX = Math.cos(angle) * rim * 0.76;
    const lugY = Math.sin(angle) * rim * 0.76;
    ctx.moveTo(lugX + rim * 0.1, lugY);
    ctx.arc(lugX, lugY, rim * 0.1, 0, 2 * Math.PI);
  }
  ctx.fill();
  ctx.restore();
}

/** A small ✕ (a dazed eye), centered on (x, y). */
function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x - size, y + size);
  ctx.lineTo(x + size, y - size);
}

/**
 * The driver's head: a round helmet, exactly the size of what counts as a hit, with a stripe over the top in the
 * player's color and a dark visor on the side the car faces (✕ ✕ eyes on it once dazed). Drawn around (0, 0).
 */
export function drawHead(ctx: CanvasRenderingContext2D, paint: CarPaint, facing: 1 | -1, options: { flash: boolean; dazed: boolean }) {
  const radius = CAR.headRadius;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.fillStyle = options.flash ? ARENA_PAINT.white : paint.helmet;
  ctx.fill();
  if (!options.flash) {
    ctx.save();
    ctx.clip();
    ctx.scale(facing, 1);
    // A racing stripe from the back of the helmet over its top.
    ctx.fillStyle = paint.body;
    ctx.fillRect(-radius * 0.42, -radius, radius * 0.34, 2 * radius);
    // The visor: a dark window across the front.
    ctx.beginPath();
    ctx.roundRect(radius * 0.08, -radius * 0.28, radius * 1.2, radius * 0.6, radius * 0.24);
    ctx.fillStyle = ARENA_PAINT.visor;
    ctx.fill();
    if (options.dazed) {
      ctx.beginPath();
      cross(ctx, radius * 0.36, radius * 0.02, radius * 0.11);
      cross(ctx, radius * 0.74, radius * 0.02, radius * 0.11);
      ctx.strokeStyle = ARENA_PAINT.white;
      ctx.lineWidth = LOOK.carLine * 0.6;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine;
  ctx.stroke();
  ctx.restore();
}

/** A five-pointed star around (x, y). */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, turn: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = turn + (i / 10) * 2 * Math.PI + Math.PI / 2;
    const reach = i % 2 === 0 ? size : size * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
    else ctx.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * The hit head, `ageMs` after the hit: it squashes flat down into the car and wobbles back (squash and stretch),
 * then dizzy stars circle above it. The head stays on the car.
 */
function drawDazedHead(ctx: CanvasRenderingContext2D, paint: CarPaint, facing: 1 | -1, ageMs: number) {
  const squash = DAZE.squash * Math.exp(-ageMs / DAZE.settleMs) * Math.cos((2 * Math.PI * ageMs) / DAZE.wobbleMs);
  const bottom = -CAR.headRadius;
  ctx.save();
  // Squashed from its bottom, so it sinks into the car rather than shrinking in the air.
  ctx.translate(0, bottom);
  ctx.scale(1 + squash * 0.6, 1 - squash);
  ctx.translate(0, -bottom);
  drawHead(ctx, paint, facing, { flash: ageMs < LOOK.headFlashMs, dazed: true });
  ctx.restore();

  if (ageMs < DAZE.starsFromMs) return;
  ctx.save();
  ctx.fillStyle = ARENA_PAINT.star;
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.6;
  ctx.lineJoin = "round";
  const spin = (2 * Math.PI * ageMs) / DAZE.starSpinMs;
  for (let i = 0; i < DAZE.stars; i++) {
    const angle = spin + (i / DAZE.stars) * 2 * Math.PI;
    // On a flat ring above the head: the stars in front are a little bigger.
    const x = Math.cos(angle) * DAZE.orbitX;
    const y = CAR.headRadius + DAZE.orbitUp + Math.sin(angle) * DAZE.orbitY;
    star(ctx, x, y, DAZE.starSize * (1 - 0.25 * Math.sin(angle)), spin);
  }
  ctx.restore();
}

interface CarLook {
  paint: CarPaint;
  /** Which way the car faces along its own length. */
  facing: 1 | -1;
  /** How far its wheels have turned (radians). */
  wheelTurn: number;
  /**
   * How far each wheel's spring is squeezed (the left wheel, then the right, the car upright; meters): 0 hanging in
   * the air, `WHEEL_REST` standing still, more on a landing. The wheel is drawn up by that much, on the ground.
   */
  wheelSqueeze: readonly [number, number];
  /** How long ago its driver's head was hit (ms), or null: the head squashes and the driver is dazed. */
  dazedFor: number | null;
}

/** The exhaust pipe poking out under the tail, behind the body. Facing right. */
function drawExhaust(ctx: CanvasRenderingContext2D) {
  const s = SHAPE;
  ctx.beginPath();
  ctx.roundRect(s.rear - 0.12, s.rearY + 0.02, 0.26, 0.1, 0.04);
  ctx.fillStyle = ARENA_PAINT.exhaust;
  ctx.fill();
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.8;
  ctx.stroke();
}

/** The driver's shoulders in the cockpit, behind the helmet and the body. Facing right. */
function drawShoulders(ctx: CanvasRenderingContext2D, paint: CarPaint) {
  const { x, y, width, height, radius } = SHOULDERS;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = paint.bodyLow;
  ctx.fill();
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.8;
  ctx.stroke();
}

/** On the body: the stripe and the windscreen. Facing right. */
function drawDetails(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.clip(BODY);
  ctx.fillStyle = ARENA_PAINT.stripe;
  ctx.fill(STRIPE);
  ctx.restore();
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.8;
  ctx.fillStyle = ARENA_PAINT.glass;
  ctx.fill(WINDSCREEN);
  ctx.stroke(WINDSCREEN);
}

/** The lights, over the outline: a round yellow headlight on the nose, a coral one on the tail. Facing right. */
function drawLights(ctx: CanvasRenderingContext2D) {
  const s = SHAPE;
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine * 0.8;
  ctx.beginPath();
  ctx.arc(s.front - 0.05, s.nose - 0.12, 0.08, 0, 2 * Math.PI);
  ctx.fillStyle = ARENA_PAINT.headlight;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(s.rear - 0.06, s.deck - 0.26, 0.12, 0.15, 0.05);
  ctx.fillStyle = ARENA_PAINT.taillight;
  ctx.fill();
  ctx.stroke();
}

/**
 * One car at (x, y), turned by `angle`: an open-top cartoon roadster in the player's color (a roundel on the door,
 * a windscreen, lights, an exhaust), its wheels in arches that hug them, and its driver sitting in the open cockpit.
 * Same shape for everyone.
 */
export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, look: CarLook) {
  const { paint, facing } = look;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = "round";

  wheel(ctx, paint, -CAR.wheelX, look.wheelSqueeze[0], look.wheelTurn);
  wheel(ctx, paint, CAR.wheelX, look.wheelSqueeze[1], look.wheelTurn);
  ctx.save();
  ctx.scale(facing, 1);
  drawExhaust(ctx);
  drawShoulders(ctx, paint);
  ctx.restore();
  // The helmet, behind the body: the body hides its bottom, so the driver sits in the car.
  ctx.save();
  ctx.translate(0, CAR.headY);
  if (look.dazedFor === null) drawHead(ctx, paint, facing, { flash: false, dazed: false });
  else drawDazedHead(ctx, paint, facing, look.dazedFor);
  ctx.restore();

  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = paint.body;
  ctx.fill(BODY);
  drawDetails(ctx);
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine;
  ctx.stroke(BODY);
  drawLights(ctx);
  ctx.restore();
  ctx.restore();
}

/** A small arrow above your own car at the start of a round, pointing down at it (never turned with the car). */
export function drawYouMarker(ctx: CanvasRenderingContext2D, x: number, y: number, paint: CarPaint, bob: number) {
  const size = LOOK.youMarkerSize;
  const tip = y + CAR.headY + CAR.headRadius + 0.5 + bob;
  ctx.beginPath();
  ctx.moveTo(x, tip);
  ctx.lineTo(x - size, tip + size * 1.3);
  ctx.lineTo(x + size, tip + size * 1.3);
  ctx.closePath();
  ctx.fillStyle = paint.body;
  ctx.strokeStyle = ARENA_PAINT.ink;
  ctx.lineWidth = LOOK.carLine;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
}
