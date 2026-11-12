import { buttonDirection, HEADCRASH_CONFIG } from "./config";
import { liftAt } from "./layout";
import { HIT_CAUSE, SURFACE, type Block, type Car, type Fan, type Hit, type HitCause, type Layout, type Motion, type Surface } from "./types";

/**
 * Head Crash's physics: two cars, each one rigid body made of discs (two wheels, three for the body), against
 * the ground, its planks and each other. Contacts are solved as impulses, a few passes per step. The wheels sit on
 * springs: a wheel on the ground may sink into it up to the suspension's travel, pushed back by a spring (that sinking
 * is the spring's squeeze, drawn as the wheel moving up). Driving pushes where the tyre touches the ground, so the
 * body tilts. Nothing is remembered between steps but the cars themselves, so a phone can restart from any state
 * the server sends.
 */

// Read from the config on every step (not copied once), so the dev preview's tuner can change them while it plays.
const { car: CAR, drive: DRIVE, air: AIR, contact: CONTACT, suspension: SPRING, surfaces: SURFACES, gadgets: GADGETS } = HEADCRASH_CONFIG;

interface Disc {
  x: number;
  y: number;
  radius: number;
  wheel: boolean;
}

/** The solid discs of a car, around its middle (the car upright). */
export const CAR_DISCS: readonly Disc[] = [
  { x: -CAR.wheelX, y: CAR.wheelY, radius: CAR.wheelRadius, wheel: true },
  { x: CAR.wheelX, y: CAR.wheelY, radius: CAR.wheelRadius, wheel: true },
  { x: -CAR.bodyX, y: CAR.bodyY, radius: CAR.bodyRadius, wheel: false },
  { x: 0, y: CAR.bodyY, radius: CAR.bodyRadius, wheel: false },
  { x: CAR.bodyX, y: CAR.bodyY, radius: CAR.bodyRadius, wheel: false },
];
const DISC_COUNT = CAR_DISCS.length;
const INV_MASS = 1 / CAR.mass;
/** `1 / CAR.inertia`, refreshed at the start of every step. */
let invInertia = 1 / CAR.inertia;
/** Past the frame by this much (meters), a car is stopped where it is: the world has no further edge. */
const OUT_OF_WORLD = 40;

/**
 * A disc whose middle is up to this far inside the ground, past a piece of its outline, is still pushed back out
 * through that piece; deeper, the piece is ignored (it is the far side of the ground). It must stay below the
 * thinnest ground's thickness minus a wheel's reach into it (radius minus spring travel; a test checks every map):
 * a wheel squeezed all the way has its middle 0.14 above the top. With more (it was 1), the underside of a thin
 * bridge (an early map) caught a squeezed wheel and pulled it down: the car stuck in its dip.
 */
export const WALL_DEPTH = 0.5;

/** Nothing moving: lifts at the bottom. */
const STILL: Motion = { playTicks: 0 };

/** A lift's slab where it is this step, and its speed up. */
interface Mover extends Block {
  vy: number;
}
const movers: Mover[] = [];
let moverCount = 0;

/** Puts the map's lifts where they are at this moment. */
function poseMovers(layout: Layout, motion: Motion) {
  moverCount = 0;
  for (const lift of layout.lifts) {
    const { y, vy } = liftAt(lift, motion.playTicks);
    let m = movers[moverCount];
    if (!m) {
      m = { x: 0, y: 0, halfWidth: 0, halfHeight: 0, angle: 0, cos: 1, sin: 0, vy: 0 };
      movers.push(m);
    }
    moverCount += 1;
    m.x = lift.x;
    m.y = y;
    m.halfWidth = lift.halfWidth;
    m.halfHeight = lift.halfHeight;
    m.vy = vy;
  }
}

/** One touching (or nearly touching) pair this step. */
interface Contact {
  /** The car, and the other car (-1: the arena). */
  a: number;
  b: number;
  /** Unit normal, pointing at car `a`. */
  nx: number;
  ny: number;
  /** From each car's middle to the contact point. */
  rax: number;
  ray: number;
  rbx: number;
  rby: number;
  /** Gap between the surfaces (negative: overlapping). */
  gap: number;
  /** A wheel on the arena: it rolls and drives instead of rubbing. */
  drive: boolean;
  /** A wheel on the arena: it sits on its spring, and only past the suspension's travel is it solid. */
  wheel: boolean;
  /** This step's push from the wheel's spring (counts toward its grip). */
  spring: number;
  /** What the arena is made of there (rock between cars). */
  surface: Surface;
  /** How fast the arena's surface moves up there (a lift). */
  svy: number;
  friction: number;
  /** Normal speed the contact must reach (bounce, or pushing out of an overlap). */
  target: number;
  normalMass: number;
  tangentMass: number;
  /** Impulses given so far this step. */
  normal: number;
  tangent: number;
}

const contacts: Contact[] = [];
let contactCount = 0;
/** World positions of every disc: car 0's, then car 1's. */
const discX = new Float64Array(2 * DISC_COUNT);
const discY = new Float64Array(2 * DISC_COUNT);
const driveContacts = [0, 0];
/** Whether each car touches a bounce pad's top this step. */
const onPad = [false, false];
/** Each car's ground under its wheels this step: the sum of its wheels' contact normals. */
const groundNx = [0, 0];
const groundNy = [0, 0];

function addContact(a: number, b: number, nx: number, ny: number, px: number, py: number, gap: number, drive: boolean, wheel: boolean, friction: number, surface: Surface, mover: number, cars: readonly Car[]) {
  let c = contacts[contactCount];
  if (!c) {
    c = { a: 0, b: 0, nx: 0, ny: 0, rax: 0, ray: 0, rbx: 0, rby: 0, gap: 0, drive: false, wheel: false, spring: 0, surface: SURFACE.rock, svy: 0, friction: 0, target: 0, normalMass: 0, tangentMass: 0, normal: 0, tangent: 0 };
    contacts.push(c);
  }
  contactCount += 1;
  c.a = a;
  c.b = b;
  c.nx = nx;
  c.ny = ny;
  c.rax = px - cars[a]!.x;
  c.ray = py - cars[a]!.y;
  c.rbx = b < 0 ? 0 : px - cars[b]!.x;
  c.rby = b < 0 ? 0 : py - cars[b]!.y;
  c.gap = gap;
  c.drive = drive;
  c.wheel = wheel;
  c.spring = 0;
  c.surface = surface;
  c.svy = mover >= 0 ? movers[mover]!.vy : 0;
  c.friction = friction;
  c.normal = 0;
  c.tangent = 0;
}

function placeDiscs(cars: readonly Car[]) {
  for (let ci = 0; ci < 2; ci++) {
    const car = cars[ci]!;
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);
    for (let di = 0; di < DISC_COUNT; di++) {
      const d = CAR_DISCS[di]!;
      discX[ci * DISC_COUNT + di] = car.x + cos * d.x - sin * d.y;
      discY[ci * DISC_COUNT + di] = car.y + sin * d.x + cos * d.y;
    }
  }
}

/** What `touchArena` found: for each piece touched, the normal pointing at the disc, the gap between them and its surface. */
const touchNx = new Float64Array(16);
const touchNy = new Float64Array(16);
const touchGap = new Float64Array(16);
const touchSurface = new Uint8Array(16);
/** Which mover it was (-1: the still ground). */
const touchMover = new Int8Array(16);

/** Whether a disc touches a slab (a turned rectangle); if so it is added to the touches. Returns how many there are now. */
function touchBox(b: Block, x: number, y: number, radius: number, limit: number, count: number, mover: number): number {
  const relX = x - b.x;
  const relY = y - b.y;
  const localX = b.cos * relX + b.sin * relY;
  const localY = -b.sin * relX + b.cos * relY;
  const nearX = Math.max(-b.halfWidth, Math.min(b.halfWidth, localX));
  const nearY = Math.max(-b.halfHeight, Math.min(b.halfHeight, localY));
  let normalX = localX - nearX;
  let normalY = localY - nearY;
  let distance = Math.hypot(normalX, normalY);
  if (distance >= limit) return count;
  if (distance > 1e-9) {
    normalX /= distance;
    normalY /= distance;
  } else {
    // The disc's middle is inside the block: out through the nearest side.
    const outX = b.halfWidth - Math.abs(localX);
    const outY = b.halfHeight - Math.abs(localY);
    if (outX < outY) {
      normalX = localX < 0 ? -1 : 1;
      normalY = 0;
      distance = -outX;
    } else {
      normalX = 0;
      normalY = localY < 0 ? -1 : 1;
      distance = -outY;
    }
  }
  touchNx[count] = b.cos * normalX - b.sin * normalY;
  touchNy[count] = b.sin * normalX + b.cos * normalY;
  touchSurface[count] = SURFACE.rock;
  touchMover[count] = mover;
  touchGap[count] = distance - radius;
  return count + 1;
}

/**
 * Which pieces of the arena (wall, blocks, lifts) a disc touches or nearly touches (within `reach` of its edge).
 * Returns how many; they are in `touchNx`, `touchNy` and `touchGap`.
 */
function touchArena(x: number, y: number, radius: number, reach: number, layout: Layout): number {
  const { edges, blocks, grid } = layout;
  const limit = radius + reach;
  let count = 0;
  const column = Math.max(0, Math.min(grid.columns - 1, Math.floor((x - grid.x) / grid.cell)));
  const row = Math.max(0, Math.min(grid.rows - 1, Math.floor((y - grid.y) / grid.cell)));
  const nearby = grid.cells[row * grid.columns + column]!;
  for (let k = 0; k < nearby.length && count < touchGap.length; k++) {
    const i = nearby[k]!;
    const e = edges[i]!;
    const relX = x - e.ax;
    const relY = y - e.ay;
    const height = relX * e.nx + relY * e.ny;
    if (height >= limit || height < -WALL_DEPTH) continue;
    const along = relX * e.dx + relY * e.dy;
    if (along >= 0 && along <= e.length) {
      touchNx[count] = e.nx;
      touchNy[count] = e.ny;
      touchSurface[count] = e.surface;
      touchMover[count] = -1;
      touchGap[count++] = height - radius;
    } else if (along < 0 && e.cornerAtStart) {
      // Past the end of this piece, round a corner that sticks out: the corner itself is what touches.
      const before = edges[e.previous]!;
      if ((x - before.ax) * before.dx + (y - before.ay) * before.dy <= before.length) continue;
      const distance = Math.hypot(relX, relY);
      if (distance >= limit || distance < 1e-9) continue;
      touchNx[count] = relX / distance;
      touchNy[count] = relY / distance;
      touchSurface[count] = e.surface;
      touchMover[count] = -1;
      touchGap[count++] = distance - radius;
    }
  }
  for (let i = 0; i < blocks.length && count < touchGap.length; i++) count = touchBox(blocks[i]!, x, y, radius, limit, count, -1);
  for (let i = 0; i < moverCount && count < touchGap.length; i++) count = touchBox(movers[i]!, x, y, radius, limit, count, i);
  return count;
}

function findContacts(cars: readonly Car[], layout: Layout) {
  contactCount = 0;
  placeDiscs(cars);
  for (let ci = 0; ci < 2; ci++) {
    for (let di = 0; di < DISC_COUNT; di++) {
      const disc = CAR_DISCS[di]!;
      const x = discX[ci * DISC_COUNT + di]!;
      const y = discY[ci * DISC_COUNT + di]!;
      const found = touchArena(x, y, disc.radius, CONTACT.margin, layout);
      // A wheel drives through the one piece of ground it presses on most; where it also brushes another, it just rolls.
      let deepest = 0;
      for (let k = 1; k < found; k++) if (touchGap[k]! < touchGap[deepest]!) deepest = k;
      for (let k = 0; k < found; k++) {
        const nx = touchNx[k]!;
        const ny = touchNy[k]!;
        const surface = touchSurface[k] as Surface;
        const friction = disc.wheel ? 0 : CONTACT.bodyFriction;
        addContact(ci, -1, nx, ny, x - nx * disc.radius, y - ny * disc.radius, touchGap[k]!, disc.wheel && k === deepest, disc.wheel, friction, surface, touchMover[k]!, cars);
      }
    }
  }
  for (let i = 0; i < DISC_COUNT; i++) {
    for (let j = 0; j < DISC_COUNT; j++) {
      const dx = discX[i]! - discX[DISC_COUNT + j]!;
      const dy = discY[i]! - discY[DISC_COUNT + j]!;
      const reach = CAR_DISCS[i]!.radius + CAR_DISCS[j]!.radius;
      const distance = Math.hypot(dx, dy);
      if (distance >= reach + CONTACT.margin || distance < 1e-9) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      const otherRadius = CAR_DISCS[j]!.radius;
      addContact(0, 1, nx, ny, discX[DISC_COUNT + j]! + nx * otherRadius, discY[DISC_COUNT + j]! + ny * otherRadius, distance - reach, false, false, CONTACT.carFriction, SURFACE.rock, -1, cars);
    }
  }
}

/** Speed of car `a` against car `b` (or the arena) at a contact, along (x, y). */
function speedAlong(c: Contact, cars: readonly Car[], x: number, y: number): number {
  const a = cars[c.a]!;
  let vx = a.vx - a.spin * c.ray;
  let vy = a.vy + a.spin * c.rax;
  if (c.b >= 0) {
    const b = cars[c.b]!;
    vx -= b.vx - b.spin * c.rby;
    vy -= b.vy + b.spin * c.rbx;
  } else {
    // Against ground that moves (a lift).
    vy -= c.svy;
  }
  return vx * x + vy * y;
}

/** A push of `impulse` along (x, y) at the contact: on car `a`, and the opposite on car `b`. */
function push(c: Contact, cars: readonly Car[], x: number, y: number, impulse: number) {
  const a = cars[c.a]!;
  a.vx += x * impulse * INV_MASS;
  a.vy += y * impulse * INV_MASS;
  a.spin += (c.rax * y - c.ray * x) * impulse * invInertia;
  if (c.b >= 0) {
    const b = cars[c.b]!;
    b.vx -= x * impulse * INV_MASS;
    b.vy -= y * impulse * INV_MASS;
    b.spin -= (c.rbx * y - c.rby * x) * impulse * invInertia;
  }
}

/** 1 / (how easily the contact point moves along (x, y) when pushed there). */
function massAlong(c: Contact, x: number, y: number): number {
  const armA = c.rax * y - c.ray * x;
  let ease = INV_MASS + armA * armA * invInertia;
  if (c.b >= 0) {
    const armB = c.rbx * y - c.rby * x;
    ease += INV_MASS + armB * armB * invInertia;
  }
  return 1 / ease;
}

/**
 * How far each wheel of a car is pushed up into the body by its spring right now (meters; the left wheel, then the
 * right, the car upright): for drawing, so the body rocks on its wheels and the tyres sit on the ground.
 */
export function wheelSink(car: Pick<Car, "x" | "y" | "angle">, layout: Layout, motion: Motion = STILL): [number, number] {
  poseMovers(layout, motion);
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const sink: [number, number] = [0, 0];
  for (let w = 0; w < 2; w++) {
    const d = CAR_DISCS[w]!;
    const found = touchArena(car.x + cos * d.x - sin * d.y, car.y + sin * d.x + cos * d.y, d.radius, 0, layout);
    for (let k = 0; k < found; k++) sink[w] = Math.max(sink[w]!, Math.min(SPRING.travel, -touchGap[k]!));
  }
  return sink;
}

/** What happened to each car in the last step (for drawing and sounds; not part of the state). */
export interface StepReport {
  /** A wheel is on the arena. */
  grounded: [boolean, boolean];
  /** The hardest hit each car took this step (speed change, m/s), and whether the cars touched each other. */
  impact: [number, number];
  carsTouched: boolean;
  /** The hardest hit each car's body (not a wheel) took from the arena: a wall, the roof, a lift's side (speed change, m/s). */
  knock: [number, number];
  /** A bounce pad threw the car this step. */
  padThrow: [boolean, boolean];
  /** The car's middle is in a fan's air. */
  inFan: [boolean, boolean];
}

/** The fan a point is in, if any. */
export function fanAt(layout: Layout, x: number, y: number): Fan | null {
  for (const f of layout.fans) if (x >= f.minX && x <= f.maxX && y >= f.minY && y <= f.maxY) return f;
  return null;
}

/** Moves both cars one step of `dt` seconds. `buttons`: what each seat holds. `motion`: how long the round has been played (where the lifts are). */
export function stepCars(cars: [Car, Car], buttons: readonly [number, number], layout: Layout, dt: number, report?: StepReport, motion: Motion = STILL) {
  invInertia = 1 / CAR.inertia;
  poseMovers(layout, motion);
  findContacts(cars, layout);

  driveContacts[0] = 0;
  driveContacts[1] = 0;
  onPad[0] = onPad[1] = false;
  groundNx[0] = groundNx[1] = groundNy[0] = groundNy[1] = 0;
  for (let i = 0; i < contactCount; i++) {
    const c = contacts[i]!;
    if (c.drive && c.gap <= CONTACT.margin / 2) {
      driveContacts[c.a]! += 1;
      groundNx[c.a]! += c.nx;
      groundNy[c.a]! += c.ny;
    }
    c.normalMass = massAlong(c, c.nx, c.ny);
    c.tangentMass = massAlong(c, -c.ny, c.nx);
    const closing = speedAlong(c, cars, c.nx, c.ny);
    if (c.wheel && c.gap < 0) {
      // The wheel's spring: squeezed by how far the wheel has sunk, and damped by how fast.
      const squeeze = Math.min(-c.gap, SPRING.travel);
      const force = Math.max(0, SPRING.stiffness * squeeze - SPRING.damping * closing) * CAR.mass;
      c.spring = force * dt;
      push(c, cars, c.nx, c.ny, c.spring);
    }
    // Solid from here: a wheel only once its spring is squeezed all the way.
    const gap = c.wheel ? c.gap + SPRING.travel : c.gap;
    // A fast hit bounces; a gap may close but no further; an overlap is pushed apart.
    const bounce = c.b >= 0 ? CONTACT.carBounce : CONTACT.bounce;
    if (gap > 0) c.target = -gap / dt;
    else c.target = Math.min(CONTACT.maxPushSpeed, (CONTACT.pushOut * Math.max(0, -gap - CONTACT.slop)) / dt);
    if (gap <= CONTACT.slop && closing < -CONTACT.bounceMinSpeed) c.target = Math.max(c.target, -bounce * closing);
    // Touching a bounce pad's top (a wheel as soon as it touches, before its spring gives) throws the whole car up.
    if (c.surface === SURFACE.pad && c.ny >= SURFACES.padFacing && c.gap <= CONTACT.slop) onPad[c.a] = true;
  }

  for (let ci = 0; ci < 2; ci++) {
    const car = cars[ci]!;
    car.vy -= HEADCRASH_CONFIG.gravity * dt;
    // A fan's air holds the car up (less and less higher up) and slows its rising and falling.
    const fan = fanAt(layout, car.x, car.y);
    if (fan) {
      const height = Math.max(0, Math.min(1, (car.y - fan.minY) / (fan.maxY - fan.minY)));
      car.vy += HEADCRASH_CONFIG.gravity * GADGETS.fanLift * (1 - height) * dt;
      car.vy *= Math.max(0, 1 - GADGETS.fanDamping * dt);
    }
    // Straight up, as a whole: a car crossing a pad keeps its speed along and flies on, without being spun.
    if (onPad[ci]) car.vy = Math.max(car.vy, SURFACES.padLaunch);
    const direction = buttonDirection(buttons[ci]!);
    const wheelsDown = driveContacts[ci]!;
    if (wheelsDown > 0) {
      // On the ground the car tips from the push of its tyres, on its springs, and the buttons lift it too, the same
      // way round as in the air (right: counter-clockwise, so the nose of a car driving right comes up), as hard as
      // the car is still short of top speed that way: setting off or turning round pops a wheelie; at full speed
      // (down a slope, onto a jump) it rides on its wheels. The lift eases off toward `drive.tiltMax` from the ground
      // under the wheels and holds there, short of where the car would fall over backwards; letting go drops it back.
      if (direction !== 0 && DRIVE.tiltAccel > 0) {
        const length = Math.hypot(groundNx[ci]!, groundNy[ci]!) || 1;
        const gx = groundNx[ci]! / length;
        const gy = groundNy[ci]! / length;
        const upX = -Math.sin(car.angle);
        const upY = Math.cos(car.angle);
        // How far the car is turned from the ground under it (counter-clockwise positive).
        const lifted = Math.atan2(gx * upY - gy * upX, gx * upX + gy * upY);
        const room = Math.max(0, Math.min(1, (DRIVE.tiltMax - direction * lifted) / DRIVE.tiltEase));
        // Speed along the ground the button's way (the same way round as driving), as a share of top speed.
        const along = (direction * (car.vx * gy - car.vy * gx)) / DRIVE.maxSpeed;
        const push = Math.max(0, Math.min(1, 1 - along));
        const change = direction * DRIVE.tiltSpin * room * push - car.spin;
        // Below the limit only ever speeds the lift up; near it, also holds a lift that is going too far.
        if (direction * change > 0 || room < 1) car.spin += Math.max(-DRIVE.tiltAccel * dt, Math.min(DRIVE.tiltAccel * dt, change));
      }
      continue;
    }
    if (fan) {
      // In a fan's air the buttons push the car sideways instead of turning it, and it steadies.
      car.vx += direction * GADGETS.fanSteer * dt;
      car.spin *= Math.max(0, 1 - AIR.damping * dt);
      continue;
    }
    // In the air the buttons turn the car, the way spinning wheels would: the right button (wheels clockwise) turns
    // the body counter-clockwise. So holding the button that drove you up a wall keeps the loop turning onto your
    // wheels.
    if (direction === 0) car.spin *= Math.max(0, 1 - AIR.damping * dt);
    else car.spin += Math.max(-AIR.spinAccel * dt, Math.min(AIR.spinAccel * dt, direction * AIR.maxSpin - car.spin));
  }

  for (let pass = 0; pass < CONTACT.iterations; pass++) {
    for (let i = 0; i < contactCount; i++) {
      const c = contacts[i]!;
      const wanted = (c.target - speedAlong(c, cars, c.nx, c.ny)) * c.normalMass;
      const normal = Math.max(0, c.normal + wanted);
      push(c, cars, c.nx, c.ny, normal - c.normal);
      c.normal = normal;

      if (c.drive) {
        // A wheel on the ground: the button drives it along the ground (right: clockwise), as hard as it grips. The
        // push is where the tyre meets the ground, so it also tips the body (a share of it: `lean`).
        const car = cars[c.a]!;
        const direction = buttonDirection(buttons[c.a]!);
        const tx = c.ny;
        const ty = -c.nx;
        // How fast the wheel's middle moves along the ground.
        const hubX = c.rax + c.nx * CAR.wheelRadius;
        const hubY = c.ray + c.ny * CAR.wheelRadius;
        const speed = (car.vx - car.spin * hubY) * tx + (car.vy + car.spin * hubX) * ty;
        const share = driveContacts[c.a]! || 1;
        const budget = ((direction === 0 ? DRIVE.rollDecel : DRIVE.accel) * dt * CAR.mass) / share;
        const limit = Math.min(budget, DRIVE.grip * (c.normal + c.spring));
        const tangent = Math.max(-limit, Math.min(limit, c.tangent + (direction * DRIVE.maxSpeed - speed) * CAR.mass));
        const impulse = tangent - c.tangent;
        car.vx += tx * impulse * INV_MASS;
        car.vy += ty * impulse * INV_MASS;
        car.spin += (c.rax * ty - c.ray * tx) * impulse * invInertia * DRIVE.lean;
        c.tangent = tangent;
      } else {
        const tx = -c.ny;
        const ty = c.nx;
        const limit = c.friction * c.normal;
        const tangent = Math.max(-limit, Math.min(limit, c.tangent - speedAlong(c, cars, tx, ty) * c.tangentMass));
        push(c, cars, tx, ty, tangent - c.tangent);
        c.tangent = tangent;
      }
    }
  }

  for (let ci = 0; ci < 2; ci++) {
    const car = cars[ci]!;
    const speed = Math.hypot(car.vx, car.vy);
    if (speed > CAR.maxSpeed) {
      car.vx *= CAR.maxSpeed / speed;
      car.vy *= CAR.maxSpeed / speed;
    }
    car.spin = Math.max(-CAR.maxSpin, Math.min(CAR.maxSpin, car.spin));
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.angle += car.spin * dt;
    // A car thrown off an open map falls into the water long before this; it only keeps the numbers sane.
    if (car.x < layout.minX - OUT_OF_WORLD || car.x > layout.maxX + OUT_OF_WORLD || car.y < layout.floorY - OUT_OF_WORLD || car.y > layout.topY + OUT_OF_WORLD) {
      car.x = Math.max(layout.minX - OUT_OF_WORLD, Math.min(layout.maxX + OUT_OF_WORLD, car.x));
      car.y = Math.max(layout.floorY - OUT_OF_WORLD, Math.min(layout.topY + OUT_OF_WORLD, car.y));
      car.vx = 0;
      car.vy = 0;
    }
  }

  if (report) {
    report.grounded[0] = driveContacts[0]! > 0;
    report.grounded[1] = driveContacts[1]! > 0;
    report.impact[0] = report.impact[1] = 0;
    report.knock[0] = report.knock[1] = 0;
    report.carsTouched = false;
    for (let ci = 0; ci < 2; ci++) {
      report.padThrow[ci] = onPad[ci]!;
      report.inFan[ci] = fanAt(layout, cars[ci]!.x, cars[ci]!.y) !== null;
    }
    for (let i = 0; i < contactCount; i++) {
      const c = contacts[i]!;
      const hit = c.normal * INV_MASS;
      report.impact[c.a] = Math.max(report.impact[c.a]!, hit);
      if (c.b < 0 && !c.wheel) report.knock[c.a] = Math.max(report.knock[c.a]!, hit);
      if (c.b >= 0) {
        report.impact[c.b] = Math.max(report.impact[c.b]!, hit);
        if (c.normal > 0) report.carsTouched = true;
      }
    }
  }
}

/** Where a car's head is. */
export function headOf(car: Pick<Car, "x" | "y" | "angle">): { x: number; y: number } {
  return { x: car.x - Math.sin(car.angle) * CAR.headY, y: car.y + Math.cos(car.angle) * CAR.headY };
}

/**
 * Whether anything touches a head: the other car, the arena, or the water (at `waterY`). The other car comes
 * first: a car pushed onto the floor by a landing was hit by the car, not the floor.
 */
export function findHit(cars: readonly [Car, Car], layout: Layout, waterY: number, motion: Motion = STILL): Hit | null {
  poseMovers(layout, motion);
  placeDiscs(cars);
  const victims: [boolean, boolean] = [false, false];
  let cause: HitCause = HIT_CAUSE.water;
  let found = false;
  let hitX = 0;
  let hitY = 0;
  const note = (seat: number, by: HitCause, x: number, y: number) => {
    victims[seat] = true;
    if (!found || by < cause) {
      cause = by;
      hitX = x;
      hitY = y;
    }
    found = true;
  };
  const heads = [headOf(cars[0]), headOf(cars[1])];
  const headsApart = Math.hypot(heads[0]!.x - heads[1]!.x, heads[0]!.y - heads[1]!.y);
  if (headsApart < 2 * CAR.headRadius) {
    const middleX = (heads[0]!.x + heads[1]!.x) / 2;
    const middleY = (heads[0]!.y + heads[1]!.y) / 2;
    note(0, HIT_CAUSE.car, middleX, middleY);
    note(1, HIT_CAUSE.car, middleX, middleY);
  }
  for (let seat = 0; seat < 2; seat++) {
    const head = heads[seat]!;
    const other = 1 - seat;
    for (let di = 0; di < DISC_COUNT; di++) {
      const dx = head.x - discX[other * DISC_COUNT + di]!;
      const dy = head.y - discY[other * DISC_COUNT + di]!;
      const distance = Math.hypot(dx, dy);
      if (distance < CAR.headRadius + CAR_DISCS[di]!.radius) {
        const reach = distance > 1e-9 ? CAR.headRadius / distance : 0;
        note(seat, HIT_CAUSE.car, head.x - dx * reach, head.y - dy * reach);
      }
    }
    const found = touchArena(head.x, head.y, CAR.headRadius, 0, layout);
    for (let k = 0; k < found; k++) note(seat, HIT_CAUSE.arena, head.x - touchNx[k]! * CAR.headRadius, head.y - touchNy[k]! * CAR.headRadius);
    if (head.y < waterY) note(seat, HIT_CAUSE.water, head.x, waterY);
  }
  return found ? { victims, cause, x: hitX, y: hitY } : null;
}
