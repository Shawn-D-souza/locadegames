import { corner, curve, ease, mirrored, type Corner } from "./shapes";
import { SURFACE, type Fan, type Lift, type Surface } from "./types";

/**
 * Head Crash's maps, drawn by hand. Meters, y up; the main floor is at y = 0. Drawn on the frame from x = -15 to 15
 * and y = -3 to 12 (config `arena.frame`): water at the bottom, then ground, then the play space. The layout scales
 * everything by `arena.mapScale` (plank thickness aside), so the cars are smaller against the map.
 * Each map is the same on both halves (the left is the right's mirror image), so neither seat is better off.
 *
 * Caves have ground all round. Open maps are islands and cliffs in the sky: whoever falls off lands in the water.
 * Open maps keep tall cliffs at the sides where a car could otherwise fly off the screen.
 */

/** A piece of ground: its corners, whether the open air is inside it (a cave's play space) or outside (solid ground), and what it is made of (rock if not said). */
export interface Outline {
  corners: Corner[];
  air: "inside" | "outside";
  surface?: Surface;
}

/** A floating plank (a turned rectangle). */
export interface PlankPlan {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  angle: number;
}

export interface MapPlan {
  name: string;
  /** Ground all round (a cave), or open sky. */
  cave: boolean;
  outlines: Outline[];
  planks: PlankPlan[];
  /** Where the right car starts (the left one starts at -x), standing on the highest ground under it. */
  spawnX: number;
  /** Slabs that ride up and down by themselves. */
  lifts?: Lift[];
  /** Fans: air blowing up through these boxes. */
  fans?: Fan[];
}

/** How far solid ground reaches past the frame, so the screen never shows its end. */
const FAR_X = 22;
const FAR_UP = 80;
const FAR_DOWN = -9;

/**
 * A cave's play space: walls at ±`half` rounded into the floor and into the ceiling at `top`; the floor is flat at
 * y = 0, or the curve `floor` from x = ±`floorHalf` to the middle (0 at its ends).
 */
function cave(half: number, top: number, wallRadius: number, ceilingRadius: number, floor?: { half: number; y: (x: number) => number }): Outline {
  const bottom = floor ? curve(floor.half, 0, floor.y) : [corner(0, 0)];
  return { air: "inside", corners: mirrored([corner(0, top), corner(half, top, ceilingRadius), corner(half, 0, wallRadius), ...bottom]) };
}

/** Solid ground that is the same on both sides, from its right half (from the middle line round the right and back to it). */
function solid(half: readonly Corner[]): Outline {
  return { air: "outside", corners: mirrored([...half]) };
}

/** The outer end of a cliff: its top at height `top` up to a wall at x = `wall` that rises off the top of the screen, then round under the frame. */
const cliffSide = (top: number, wall: number, wallRadius: number): Corner[] => [corner(wall, top, wallRadius), corner(wall, FAR_UP), corner(FAR_X, FAR_UP), corner(FAR_X, FAR_DOWN)];

const WALL = 13.5;
const CEILING = 10.5;

/** The ramps' floor: a long run-up that gets steeper to a lip, then down to a flat middle. */
const RAMP = { foot: 9, lip: 4.8, height: 2.6, middle: 1.6 };
const ramp = (x: number): number =>
  x >= RAMP.lip ? RAMP.height * ((RAMP.foot - x) / (RAMP.foot - RAMP.lip)) ** 2 : ease(x, RAMP.middle, 0, RAMP.lip, RAMP.height);

/** A bounce pad set into the floor in the middle, `half` wide each way, its top level with the floor. */
const pad = (half: number): Outline => ({
  air: "outside",
  surface: SURFACE.pad,
  corners: mirrored([corner(0, 0), corner(half, 0), corner(half, -0.8, 0.3), corner(0, -0.8)]),
});

/** The two floors' top floor: a slab out of each wall to its end at x = ±`end`, the hole between the two ends. */
const DECK = { end: 4.8, top: 4, bottom: 3.2 };

export const MAPS: readonly MapPlan[] = [
  {
    // The classic: a rounded bowl with a flat floor, curved walls to drive up and over.
    name: "bowl",
    cave: true,
    outlines: [cave(WALL, CEILING, 5, 4.5)],
    planks: [],
    spawnX: 7.5,
  },
  {
    // A rock in the middle of the cave: drive round it, under it or over it.
    name: "ring",
    cave: true,
    outlines: [
      cave(WALL, CEILING, 5, 5),
      { air: "outside", corners: [corner(-5.6, 3.9, 1.3), corner(-5.6, 6.3, 1.3), corner(5.6, 6.3, 1.3), corner(5.6, 3.9, 1.3)] },
    ],
    planks: [],
    spawnX: 7.5,
  },
  {
    // High ledges at the sides and a valley between them: the starts look down on each other.
    name: "valley",
    cave: false,
    outlines: [solid([...curve(0, 10.4, (x) => ease(x, 4, -1.2, 10.4, 3.6)), ...cliffSide(3.6, WALL, 1.5), corner(0, FAR_DOWN)])],
    planks: [],
    spawnX: 11.4,
  },
  {
    // A kicker on each side facing the middle: race at each other, take off, and meet in the air.
    name: "ramps",
    cave: true,
    outlines: [cave(WALL, CEILING, 3, 4.5, { half: RAMP.foot, y: ramp })],
    planks: [],
    spawnX: 9.9,
  },
  {
    // A bounce pad in the middle of the floor throws any car that touches it high: bounce when the other is under you.
    name: "trampoline",
    cave: true,
    outlines: [cave(WALL, CEILING, 5, 4.5), pad(3)],
    planks: [],
    spawnX: 7.5,
  },
  {
    // A top floor with a hole in the middle: drop through it onto the head below. Below, a small bounce pad under the
    // hole throws a car crossing it back up onto the top floor; under the top floor your head is safe.
    name: "floors",
    cave: true,
    outlines: [
      {
        air: "inside",
        corners: mirrored([
          corner(0, CEILING),
          corner(WALL, CEILING, 4.5),
          corner(WALL, DECK.top, 0.6),
          corner(DECK.end, DECK.top, 0.3),
          corner(DECK.end, DECK.bottom, 0.3),
          corner(WALL, DECK.bottom, 0.6),
          corner(WALL, 0, 3),
          corner(0, 0),
        ]),
      },
      pad(1.6),
    ],
    planks: [],
    spawnX: 9,
  },
  {
    // A fan in the middle of the floor: its air lifts a car and holds it up; in it the buttons steer the car sideways.
    // Float over the other car and drop on it.
    name: "fan",
    cave: true,
    outlines: [cave(WALL, CEILING, 5, 4.5)],
    planks: [],
    spawnX: 8,
    fans: [{ minX: -2.8, maxX: 2.8, minY: 0, maxY: CEILING }],
  },
  {
    // A lift in the middle rides up and down by itself: ride it up and drop on the other car. Don't be under it.
    name: "lift",
    cave: true,
    outlines: [cave(WALL, CEILING, 5, 4.5)],
    planks: [],
    spawnX: 8,
    lifts: [{ x: 0, low: -0.4, high: 5.4, halfWidth: 2.4, halfHeight: 0.4 }],
  },
];
