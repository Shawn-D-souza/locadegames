import { HEADCRASH_CONFIG } from "./config";
import { MAPS, type MapPlan } from "./maps";
import { mixSeed, seededRandom } from "./random";
import { rounded, signedArea } from "./shapes";
import { SURFACE, type Block, type Car, type Layout, type Lift, type Motion, type Point, type Surface, type WallEdge, type WallGrid } from "./types";

/**
 * The map of each round, from the match's seed and the round's number: the maps (`maps.ts`) in an order shuffled
 * once per match, so none comes back until all have been played. Pure: the server and both phones build the same.
 */

const { arena: ARENA, car: CAR, gadgets: GADGETS } = HEADCRASH_CONFIG;
/** The frame every screen shows, at the maps' scale. */
const SCALE = ARENA.mapScale;
const FRAME = { halfWidth: ARENA.frame.halfWidth * SCALE, bottom: ARENA.frame.bottom * SCALE, top: ARENA.frame.top * SCALE };

/** How far each wheel's spring is squeezed by the car's weight, standing still on level ground (meters; at most its travel). */
export const restSink = () => Math.min(HEADCRASH_CONFIG.suspension.travel, HEADCRASH_CONFIG.gravity / 2 / HEADCRASH_CONFIG.suspension.stiffness);

/** How high a car's middle sits above the ground under its wheels, standing still (its springs squeezed by its weight). */
export const rideHeight = () => CAR.wheelRadius - CAR.wheelY - restSink();

/** Every outline's pieces, each with the open air on its left and its outline's surface; corners that stick out into the air are marked. */
function edgesOf(outlines: readonly Point[][], surfaces: readonly Surface[]): WallEdge[] {
  const edges: WallEdge[] = [];
  outlines.forEach((outline, index) => {
    const surface = surfaces[index]!;
    const first = edges.length;
    const count = outline.length;
    outline.forEach((a, i) => {
      const b = outline[(i + 1) % count]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const dx = (b.x - a.x) / length;
      const dy = (b.y - a.y) / length;
      edges.push({ ax: a.x, ay: a.y, dx, dy, length, nx: -dy, ny: dx, previous: first + ((i + count - 1) % count), cornerAtStart: false, surface });
    });
    for (let i = first; i < edges.length; i++) {
      const edge = edges[i]!;
      const before = edges[edge.previous]!;
      // Turning right at this corner (walking with the air on the left): the corner points into the air.
      edge.cornerAtStart = before.dx * edge.dy - before.dy * edge.dx < -1e-9;
    }
  });
  return edges;
}

/** Squares this big; a piece of ground is listed in every square within `GRID_REACH` of it (more than any disc's reach). */
const GRID_CELL = 1.5;
const GRID_REACH = 1.1;
/** The grid covers the frame and this much around it (a car outside it uses the nearest square's list). */
const GRID_MARGIN = 4;

function gridOf(edges: readonly WallEdge[]): WallGrid {
  const minX = -FRAME.halfWidth - GRID_MARGIN;
  const minY = FRAME.bottom - GRID_MARGIN;
  const columns = Math.ceil((2 * (FRAME.halfWidth + GRID_MARGIN)) / GRID_CELL);
  const rows = Math.ceil((FRAME.top - FRAME.bottom + 2 * GRID_MARGIN) / GRID_CELL);
  const cells: number[][] = Array.from({ length: columns * rows }, () => []);
  const column = (x: number) => Math.max(0, Math.min(columns - 1, Math.floor((x - minX) / GRID_CELL)));
  const row = (y: number) => Math.max(0, Math.min(rows - 1, Math.floor((y - minY) / GRID_CELL)));
  edges.forEach((e, i) => {
    const bx = e.ax + e.dx * e.length;
    const by = e.ay + e.dy * e.length;
    for (let r = row(Math.min(e.ay, by) - GRID_REACH); r <= row(Math.max(e.ay, by) + GRID_REACH); r++) {
      for (let c = column(Math.min(e.ax, bx) - GRID_REACH); c <= column(Math.max(e.ax, bx) + GRID_REACH); c++) cells[r * columns + c]!.push(i);
    }
  });
  return { x: minX, y: minY, cell: GRID_CELL, columns, rows, cells };
}

/** A car standing on the highest ground under `x` (below the frame's top), turned to the slope there. */
function spawnAt(x: number, edges: readonly WallEdge[]): Car {
  let best: { edge: WallEdge; y: number } | null = null;
  for (const e of edges) {
    if (e.ny < 0.3) continue;
    const t = (x - e.ax) / e.dx;
    if (t < -1e-9 || t > e.length + 1e-9) continue;
    const y = e.ay + e.dy * t;
    // On a corner where two pieces meet, the more level one.
    if (y < FRAME.top && (!best || y > best.y + 1e-9 || (y > best.y - 1e-9 && e.ny > best.edge.ny))) best = { edge: e, y };
  }
  if (!best) throw new Error(`no ground under x = ${x}`);
  const { edge, y } = best;
  const height = rideHeight();
  return { x: x + edge.nx * height, y: y + edge.ny * height, angle: Math.atan2(edge.dy, edge.dx), vx: 0, vy: 0, spin: 0 };
}

/**
 * Where a lift is after `playTicks` steps of play, from 0 (bottom) to 1 (top), and how fast that share changes (a
 * second): it waits at the bottom, rises, waits at the top and comes down, easing in and out, over and over.
 */
export function liftShare(playTicks: number): { at: number; speed: number } {
  const { liftWait: wait, liftMove: move } = GADGETS;
  const seconds = (playTicks / HEADCRASH_CONFIG.tickRate) % (2 * (wait + move));
  const easing = (t: number) => ({ at: (1 - Math.cos(Math.PI * t)) / 2, speed: (Math.PI / 2) * Math.sin(Math.PI * t) / move });
  if (seconds < wait) return { at: 0, speed: 0 };
  if (seconds < wait + move) return easing((seconds - wait) / move);
  if (seconds < 2 * wait + move) return { at: 1, speed: 0 };
  const down = easing((seconds - 2 * wait - move) / move);
  return { at: 1 - down.at, speed: -down.speed };
}

/** A lift's middle height and its speed up after `playTicks` steps of play. */
export function liftAt(lift: Lift, playTicks: number): { y: number; vy: number } {
  const { at, speed } = liftShare(playTicks);
  return { y: lift.low + (lift.high - lift.low) * at, vy: (lift.high - lift.low) * speed };
}

/** The lifts' slabs where they are at this moment (for drawing; the physics poses its own). */
export const slabsAt = (layout: Layout, motion: Motion): Block[] =>
  layout.lifts.map((l) => ({ x: l.x, y: liftAt(l, motion.playTicks).y, halfWidth: l.halfWidth, halfHeight: l.halfHeight, angle: 0, cos: 1, sin: 0 }));

function buildLayout(plan: MapPlan): Layout {
  // Turned so the air is on the left: a cave's play space counter-clockwise, solid ground clockwise.
  const outlines = plan.outlines.map(({ corners, air }) => {
    const points = rounded(corners.map((c) => ({ x: c.x * SCALE, y: c.y * SCALE, r: c.r * SCALE })));
    const counterClockwise = signedArea(points) > 0;
    return counterClockwise === (air === "inside") ? points : points.reverse();
  });
  const surfaces = plan.outlines.map((o) => o.surface ?? SURFACE.rock);
  const edges = edgesOf(outlines, surfaces);
  const blocks: Block[] = plan.planks.map((p) => ({
    x: p.x * SCALE,
    y: p.y * SCALE,
    halfWidth: p.halfWidth * SCALE,
    halfHeight: p.halfHeight,
    angle: p.angle,
    cos: Math.cos(p.angle),
    sin: Math.sin(p.angle),
  }));
  return {
    name: plan.name,
    outlines,
    surfaces,
    cave: plan.cave,
    edges,
    blocks,
    lifts: (plan.lifts ?? []).map((l) => ({ x: l.x * SCALE, low: l.low * SCALE, high: l.high * SCALE, halfWidth: l.halfWidth * SCALE, halfHeight: l.halfHeight * SCALE })),
    fans: (plan.fans ?? []).map((f) => ({ minX: f.minX * SCALE, maxX: f.maxX * SCALE, minY: f.minY * SCALE, maxY: f.maxY * SCALE })),
    grid: gridOf(edges),
    spawns: [spawnAt(-plan.spawnX * SCALE, edges), spawnAt(plan.spawnX * SCALE, edges)],
    minX: -FRAME.halfWidth,
    maxX: FRAME.halfWidth,
    floorY: FRAME.bottom,
    topY: FRAME.top,
  };
}

const built = new Map<string, Layout>();

/** The map with this name, built once. */
export function mapLayout(name: string): Layout {
  let layout = built.get(name);
  if (!layout) {
    const plan = MAPS.find((m) => m.name === name);
    if (!plan) throw new Error(`no map ${name}`);
    layout = buildLayout(plan);
    built.set(name, layout);
  }
  return layout;
}

const orders = new Map<number, readonly string[]>();
const ORDERS_KEPT = 12;

/** The maps in this match's order: shuffled by its seed. */
function orderFor(seed: number): readonly string[] {
  let order = orders.get(seed);
  if (!order) {
    const random = seededRandom(mixSeed(seed, 0x6d6170));
    const names = MAPS.map((m) => m.name);
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [names[i], names[j]] = [names[j]!, names[i]!];
    }
    order = names;
    if (orders.size >= ORDERS_KEPT) orders.delete(orders.keys().next().value!);
    orders.set(seed, order);
  }
  return order;
}

/** The map of round `round` of the match with this seed: each map once before any comes back. */
export function layoutFor(seed: number, round: number): Layout {
  const order = orderFor(seed);
  return mapLayout(order[round % order.length]!);
}
