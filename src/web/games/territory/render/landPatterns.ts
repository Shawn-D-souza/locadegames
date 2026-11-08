import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { darken, getPlayerColor, lighten } from "../../../../theme";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/**
 * The pattern on each player's land, with depth: lit from above in flat colors, the platform's lip trick
 * used inside the land. Raised things have a darker side below and a light top edge; sunken things a
 * shadow along their top inside edge and light along the bottom. The same pattern for everyone, in their
 * own color, fixed to the world so it never swims as the camera moves. `look.landPattern.kind` picks it.
 */

const W = TERRITORY_CONFIG.trailWidth;
const PATTERN = TERRITORY_CLIENT_CONFIG.look.landPattern;
/** The tile's size in canvas px: sharp at the follow camera's zoom on a 3x phone. */
const TILE_PX = 256;

export type LandPatternKind = typeof PATTERN.kind;

interface Shades {
  /** The land's own color. */
  base: string;
  /** Side of a raised thing. */
  side: string;
  /** Top of a raised thing. */
  top: string;
  /** Light edges. */
  light: string;
  /** Shadow inside the top edge of a hole. */
  shadow: string;
  /** Bottom of a hole. */
  hole: string;
}

/** A tile painter: the tile is `s` px square; `d` the depth of sides and shadows, `h` the light edge, in px. */
type Painter = (t: CanvasRenderingContext2D, s: number, d: number, h: number, c: Shades) => void;

/** Fills `shape` (built in tile px by `add`) as a raised thing: side below, light top edge, top. */
function raised(t: CanvasRenderingContext2D, add: (p: Path2D) => void, d: number, h: number, c: Shades) {
  const p = new Path2D();
  add(p);
  t.save();
  t.translate(0, d);
  t.fillStyle = c.side;
  t.fill(p);
  t.restore();
  t.fillStyle = c.light;
  t.fill(p);
  t.save();
  t.clip(p);
  t.translate(0, h);
  t.fillStyle = c.top;
  t.fill(p);
  t.restore();
}

/** Fills `shape` as a sunken thing: shadow along its top inside edge, light along its bottom. */
function sunken(t: CanvasRenderingContext2D, add: (p: Path2D) => void, d: number, h: number, c: Shades) {
  const p = new Path2D();
  add(p);
  t.save();
  t.clip(p);
  t.fillStyle = c.light;
  t.fill(p);
  t.translate(0, -h);
  t.clip(p);
  t.translate(0, h);
  t.fillStyle = c.shadow;
  t.fill(p);
  t.translate(0, d);
  t.fillStyle = c.hole;
  t.fill(p);
  t.restore();
}

const circle = (x: number, y: number, r: number) => (p: Path2D) => {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, Math.PI * 2);
};

/** A diagonal band (top right to bottom left) through x + y = k·s, `width` px across. */
const diagonalBands = (s: number, width: number) => (p: Path2D) => {
  const n = width / 2 / Math.SQRT2;
  for (const k of [0, 1, 2]) {
    const K = k * s;
    p.moveTo(-s + n, K + s + n);
    p.lineTo(2 * s + n, K - 2 * s + n);
    p.lineTo(2 * s - n, K - 2 * s - n);
    p.lineTo(-s - n, K + s - n);
    p.closePath();
  }
};

const starShape = (x: number, y: number, r: number) => (p: Path2D) => {
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.48;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) p.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    else p.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  p.closePath();
};

/** Two things per tile on a diagonal: a staggered grid. Drawn with their wrap-around copies, so nothing is cut at the tile's edge. */
function staggered(s: number, each: (x: number, y: number) => void) {
  for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]] as const) {
    for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) each((x + ox) * s, (y + oy) * s);
  }
}

const PAINTERS: Record<LandPatternKind, Painter> = {
  // Round pegs sticking up, like a game board.
  studs: (t, s, d, h, c) => staggered(s, (x, y) => raised(t, circle(x, y, 0.16 * s), d, h, c)),
  // Round dimples pressed in, like a peg board.
  holes: (t, s, d, h, c) => staggered(s, (x, y) => sunken(t, circle(x, y, 0.14 * s), d, h, c)),
  // Raised rounded squares with grooves between them.
  tiles: (t, s, d, h, c) => {
    const gap = 0.05 * s;
    for (const ox of [-1, 0, 1]) {
      for (const oy of [-1, 0, 1]) {
        // Tops in the land's own color: the land itself reads as tiled, not covered in lighter squares.
        raised(t, (p) => p.roundRect(ox * s + gap / 2, oy * s + gap / 2, s - gap, s - gap - d, 0.12 * s), d, h, { ...c, top: c.base });
      }
    }
  },
  // Wide bands carved in.
  grooves: (t, s, d, h, c) => sunken(t, diagonalBands(s, 0.3 * s), d, h, c),
  // A few big raised stars.
  stamps: (t, s, d, h, c) => staggered(s, (x, y) => raised(t, starShape(x, y, 0.2 * s), d, h, c)),
  // Carved bands with small raised rivets between them.
  rivets: (t, s, d, h, c) => {
    sunken(t, diagonalBands(s, 0.2 * s), d, h, c);
    for (const k of [0.25, 0.75]) {
      for (const along of [-0.25, 0.25]) {
        const x = (k + along) * s;
        const y = (k - along) * s;
        for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) raised(t, circle(x + ox * s, y + oy * s, 0.045 * s), d * 0.6, h * 0.6, c);
      }
    }
  },
};

const cache = new Map<number, CanvasPattern | null>();

/** The pattern for a player's land, in world units (cached per player). */
export function landPattern(ctx: CanvasRenderingContext2D, id: number): CanvasPattern | null {
  if (cache.has(id)) return cache.get(id) ?? null;
  const pattern = makePattern(ctx, id);
  cache.set(id, pattern);
  return pattern;
}

function makePattern(ctx: CanvasRenderingContext2D, id: number): CanvasPattern | null {
  const tile = document.createElement("canvas");
  tile.width = tile.height = TILE_PX;
  const t = tile.getContext("2d");
  if (!t) return null;
  const base = getPlayerColor(id).base;
  const shades: Shades = {
    base,
    side: darken(base, PATTERN.shades.side),
    top: lighten(base, PATTERN.shades.top),
    light: lighten(base, PATTERN.shades.light),
    shadow: darken(base, PATTERN.shades.shadow),
    hole: darken(base, PATTERN.shades.hole),
  };
  const tileWorld = PATTERN.tile[PATTERN.kind] * W;
  const pxPerUnit = TILE_PX / tileWorld;
  PAINTERS[PATTERN.kind](t, TILE_PX, PATTERN.depth * W * pxPerUnit, PATTERN.edge * W * pxPerUnit, shades);
  const pattern = ctx.createPattern(tile, "repeat");
  pattern?.setTransform(new DOMMatrix().scale(1 / pxPerUnit));
  return pattern;
}
