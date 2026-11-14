import { seededRandom } from "../../../shared/random";
import { across, pathLength, snakeWidth, type Point } from "./geometry";

/**
 * A snake's skin: speckled (owner's pick 2026-11-14, from six on the preview page; flat one-color marks (a stripe,
 * dots, bands, diamonds, a zigzag) read like stickers, not skin). A pale belly down one side, from right under the
 * head (owner direction: it must start at the head on every snake) into the tail, makes the slim body look round, and
 * bold ink specks are scattered over its back: a snake is only about 10 px wide on a phone, so fine detail would blur.
 * Pure geometry in board units, drawn clipped to the body, before its outline.
 */

/** The marks' colors: `dark` is the ink, `belly` the pale belly. */
export type SkinTone = "dark" | "belly";

/** A filled shape in one of the tones. */
export interface SkinMark {
  d: string;
  tone: SkinTone;
}

/** The belly: which side of the body (+1: the spine's `across` side), and how far from the spine it starts (a share of the half-width). */
const BELLY = { side: 1, from: 0.25 } as const;
/** Where along the body the specks are scattered: from behind the head into the tail. */
const SPECKLED = { from: 0.06, to: 0.9 } as const;
/** Specks per board unit of body, their size range, how far across the back they spread (shares of the half-width). */
const SPECKS = { perUnit: 0.9, small: 0.22, big: 0.4, from: -0.9, to: 0.15 } as const;
/** How much longer than wide a speck is, lying along the body. */
const SPECK_LENGTH = 1.3;
/** The body's half-width where specks are their own size (further down the tail they shrink with it). */
const SPECK_SIZE_AT = 0.3;

const offset = (p: Point, n: Point, by: number): Point => ({ x: p.x + n.x * by, y: p.y + n.y * by });
const path = (shape: readonly Point[]) => `M${shape.map((q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join("L")}Z`;

/** The spine at `t` (0 head … 1 tail): the point, the direction along and across, and the body's half-width there. */
function frame(spine: readonly Point[], t: number): { p: Point; along: Point; n: Point; w: number } {
  const index = Math.round(t * (spine.length - 1));
  const n = across(spine, index);
  return { p: spine[index]!, along: { x: n.y, y: -n.x }, n, w: snakeWidth(t) };
}

/** The belly: a band from `BELLY.from` out past the body's edge (the body cuts it off), the whole length, starting under the head. */
function belly(spine: readonly Point[]): string {
  const inner: Point[] = [];
  const outer: Point[] = [];
  spine.forEach((_, i) => {
    const { p, n, w } = frame(spine, i / (spine.length - 1));
    inner.push(offset(p, n, BELLY.side * BELLY.from * w));
    outer.push(offset(p, n, BELLY.side * 2 * w));
  });
  return path([...inner, ...outer.reverse()]);
}

/** The skin of a snake along `spine`, in drawing order: the belly, then the specks (the same on every phone: seeded by where the snake is). */
export function snakeSkin(spine: readonly Point[]): SkinMark[] {
  const random = seededRandom(Math.round(spine[0]!.x * 100 + spine[0]!.y));
  const count = Math.round(pathLength(spine) * (SPECKLED.to - SPECKLED.from) * SPECKS.perUnit);
  const specks = Array.from({ length: count }, (): SkinMark => {
    const { p, along, n, w } = frame(spine, SPECKLED.from + (SPECKLED.to - SPECKLED.from) * random());
    const at = offset(p, n, (SPECKS.from + (SPECKS.to - SPECKS.from) * random()) * w);
    const r = (SPECKS.small + (SPECKS.big - SPECKS.small) * random()) * (w / snakeWidth(SPECK_SIZE_AT));
    return { d: path([offset(at, along, r * SPECK_LENGTH), offset(at, n, r), offset(at, along, -r * SPECK_LENGTH), offset(at, n, -r)]), tone: "dark" };
  });
  return [{ d: belly(spine), tone: "belly" }, ...specks];
}
