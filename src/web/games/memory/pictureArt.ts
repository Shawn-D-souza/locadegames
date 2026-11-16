import type { PictureId } from "../../../shared/games/memory/pictures";
import { PIECE_SHAPES } from "../chess/pieceShapes";

/**
 * Every picture a card can show, drawn in a 100-unit box as pure data (our own drawings in the look of the games they
 * come from): flat parts in the card's color (`player`) and its lighter and darker shades, outlined in ink like the
 * rest of the platform. Chess' pieces are the game's own shapes.
 */
export type Paint = "player" | "light" | "dark" | "white" | "ink" | "shaft";

export type Layer =
  /** A shape filled and outlined in ink. */
  | { kind: "fill"; d: string; paint: Paint; transform?: string }
  /** A shape filled, no outline (a shine, a pupil). */
  | { kind: "flat"; d: string; paint: Paint; transform?: string }
  /** A thick line with an ink edge (the X, the O, the snake's body, the trophy's handles). */
  | { kind: "stroke"; d: string; paint: Paint; width: number; transform?: string }
  /** A thin ink line (the knight's mane, a wheel's spokes). */
  | { kind: "ink"; d: string; transform?: string };

export interface PictureArt {
  /** For screen readers and playtests: "knight", "die showing 3". */
  name: string;
  layers: readonly Layer[];
  /** How much its `transform`s scale it up: outlines are drawn that much thinner, so every picture's outline is the same weight. */
  scale?: number;
}

/** A circle as a path, so every part is one kind of thing. */
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

/** A rectangle with rounded corners. */
const box = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} h${w - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${h - 2 * r} a${r} ${r} 0 0 1 ${-r} ${r} h${-(w - 2 * r)} a${r} ${r} 0 0 1 ${-r} ${-r} v${-(h - 2 * r)} a${r} ${r} 0 0 1 ${r} ${-r} Z`;

/** A five-pointed star around (cx, cy). */
function star(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    return `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join(" L")} Z`;
}

/** A die's pips on its 3 × 3 grid (0–8, reading order), like the dice games' die. */
const PIPS: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A die in the card's color with white pips. */
function die(face: number): PictureArt {
  const spot = (i: number) => 30 + (i % 3) * 20;
  return {
    name: `die showing ${face}`,
    layers: [
      { kind: "fill", d: box(14, 14, 72, 72, 16), paint: "player" },
      ...PIPS[face]!.map((i): Layer => ({ kind: "fill", d: circle(spot(i), 30 + Math.floor(i / 3) * 20, 6.5), paint: "white" })),
    ],
  };
}

/** A chess piece: the game's own shape, in the card's color. */
function chess(kind: keyof typeof PIECE_SHAPES): PictureArt {
  const shape = PIECE_SHAPES[kind];
  return {
    name: kind,
    layers: [
      ...shape.parts.map((d): Layer => ({ kind: "fill", d, paint: "player" })),
      ...(shape.dots ?? []).map((d): Layer => ({ kind: "flat", d, paint: "ink" })),
      ...(shape.lines ?? []).map((d): Layer => ({ kind: "ink", d })),
    ],
  };
}

/** The crown's own shape (the results' gold crown, `GoldCrown`), scaled up to fill the card. */
const CROWN = "translate(7 14) scale(1.8)";

export const PICTURE_ART: Record<PictureId, PictureArt> = {
  circle: { name: "circle", layers: [{ kind: "fill", d: circle(50, 50, 33), paint: "player" }] },
  square: { name: "square", layers: [{ kind: "fill", d: box(19, 19, 62, 62, 4), paint: "player" }] },
  triangle: { name: "triangle", layers: [{ kind: "fill", d: "M50 15 L88 82 L12 82 Z", paint: "player" }] },
  star: { name: "star", layers: [{ kind: "fill", d: star(50, 54, 38, 16), paint: "player" }] },
  heart: {
    name: "heart",
    layers: [{ kind: "fill", d: "M50 86 C24 68 10 52 13 36 C16 21 37 15 50 31 C63 15 84 21 87 36 C90 52 76 68 50 86 Z", paint: "player" }],
  },
  moon: { name: "moon", layers: [{ kind: "fill", d: "M58 14 A37 37 0 1 0 86 66 A29 29 0 0 1 58 14 Z", paint: "player" }] },
  x: { name: "X", layers: [{ kind: "stroke", d: "M24 24 L76 76 M76 24 L24 76", paint: "player", width: 16 }] },
  o: { name: "O", layers: [{ kind: "stroke", d: circle(50, 50, 28), paint: "player", width: 16 }] },
  king: chess("king"),
  queen: chess("queen"),
  rook: chess("rook"),
  bishop: chess("bishop"),
  knight: chess("knight"),
  pawn: chess("pawn"),
  car: {
    name: "car",
    layers: [
      // Head Crash's open-top roadster facing right: the driver's head (the target) sticking out above the cockpit.
      { kind: "fill", d: circle(42, 40, 11), paint: "light" },
      { kind: "flat", d: circle(46, 38, 2.6), paint: "ink" },
      { kind: "fill", d: "M8 70 V56 Q8 50 14 50 H30 Q32 56 42 56 H54 L62 40 L67 41 L62 55 Q82 55 88 60 Q93 63 93 70 Z", paint: "player" },
      { kind: "fill", d: circle(27, 72, 11), paint: "ink" },
      { kind: "fill", d: circle(74, 72, 11), paint: "ink" },
      { kind: "flat", d: circle(27, 72, 4), paint: "white" },
      { kind: "flat", d: circle(74, 72, 4), paint: "white" },
    ],
  },
  head: {
    name: "head",
    layers: [
      // Territory's character: a soft cube seen from above at an angle, a crest of three feathers at its back, eyes on its front.
      { kind: "fill", d: "M62 30 C56 18 58 8 66 4 C68 14 68 22 66 30 Z", paint: "player" },
      { kind: "fill", d: "M68 30 C68 18 74 10 82 8 C80 18 76 26 72 31 Z", paint: "player" },
      { kind: "fill", d: "M56 31 C48 22 46 13 51 7 C56 15 59 23 60 31 Z", paint: "light" },
      { kind: "fill", d: "M22 40 L38 28 Q40 27 42 27 H80 Q84 27 82 30 L68 41 Z", paint: "light" },
      { kind: "fill", d: "M68 41 L82 30 Q84 29 84 32 V70 Q84 73 82 74 L68 84 Z", paint: "dark" },
      { kind: "fill", d: box(18, 40, 50, 46, 8), paint: "player" },
      { kind: "fill", d: circle(34, 62, 7), paint: "white" },
      { kind: "fill", d: circle(52, 62, 7), paint: "white" },
      { kind: "flat", d: circle(35, 63, 3.4), paint: "ink" },
      { kind: "flat", d: circle(53, 63, 3.4), paint: "ink" },
    ],
  },
  die1: die(1),
  die2: die(2),
  die3: die(3),
  die4: die(4),
  die5: die(5),
  die6: die(6),
  cue: {
    name: "pool cue",
    layers: [
      // Pool's cue, corner to corner: the butt in the card's color, a white joint, the pale maple shaft, an ink tip.
      { kind: "fill", d: "M0 40 Q-7 50 0 60 L48 56 L48 44 Z", paint: "player", transform: "rotate(-45 50 50)" },
      { kind: "fill", d: "M48 44 L55 44.4 L55 55.6 L48 56 Z", paint: "white", transform: "rotate(-45 50 50)" },
      { kind: "fill", d: "M55 44.4 L98 46.6 L98 53.4 L55 55.6 Z", paint: "shaft", transform: "rotate(-45 50 50)" },
      { kind: "fill", d: "M98 46.6 L103 46.9 Q105.5 50 103 53.1 L98 53.4 Z", paint: "ink", transform: "rotate(-45 50 50)" },
      { kind: "fill", d: box(8, 42, 18, 16, 3), paint: "dark", transform: "rotate(-45 50 50)" },
    ],
  },
  ship: {
    name: "ship",
    layers: [
      // Sea Battle's ship from the side: a funnel, a cabin, portholes along the hull.
      { kind: "fill", d: box(64, 26, 13, 34, 3), paint: "player" },
      { kind: "fill", d: box(64, 26, 13, 9, 3), paint: "dark" },
      { kind: "fill", d: box(26, 40, 34, 20, 4), paint: "light" },
      { kind: "fill", d: "M6 58 H94 L82 79 Q80 82 76 82 H22 Q18 82 16 79 Z", paint: "player" },
      { kind: "fill", d: circle(30, 68, 3.6), paint: "white" },
      { kind: "fill", d: circle(48, 68, 3.6), paint: "white" },
      { kind: "fill", d: circle(66, 68, 3.6), paint: "white" },
    ],
  },
  cannon: {
    name: "cannon",
    layers: [
      // Sea Battle's cannon: a barrel aimed up on a wheeled carriage.
      { kind: "fill", d: "M14 40 H76 Q80 40 80 44 V58 Q80 62 76 62 H14 Q6 62 6 51 Q6 40 14 40 Z", paint: "player", transform: "rotate(-28 46 60)" },
      { kind: "fill", d: box(76, 36, 12, 30, 4), paint: "dark", transform: "rotate(-28 46 60)" },
      { kind: "fill", d: box(20, 62, 50, 14, 5), paint: "dark" },
      { kind: "fill", d: circle(44, 76, 15), paint: "light" },
      { kind: "ink", d: "M44 63 V89 M31 76 H57 M35 67 L53 85 M53 67 L35 85" },
      { kind: "fill", d: circle(44, 76, 4.5), paint: "ink" },
    ],
  },
  snake: {
    name: "snake",
    layers: [
      // Snakes & Ladders' snake: a slim S with its head up, eyes and a forked tongue.
      { kind: "ink", d: "M77 26 L88 28 M88 28 L93 24 M88 28 L92 33" },
      { kind: "stroke", d: "M14 86 C30 92 54 84 48 66 C42 48 18 52 24 34 C28 22 44 18 58 24", paint: "player", width: 12 },
      { kind: "fill", d: "M52 26 C52 16 66 14 74 18 C80 21 80 30 74 33 C66 37 52 36 52 26 Z", paint: "player" },
      { kind: "fill", d: circle(64, 21, 3.6), paint: "white" },
      { kind: "flat", d: circle(65, 21, 1.8), paint: "ink" },
    ],
  },
  ladder: {
    name: "ladder",
    layers: [
      // Snakes & Ladders' ladder: two rails and five rungs, leaning a little.
      ...[18, 34, 50, 66, 82].map((y): Layer => ({ kind: "fill", d: box(30, y - 3.5, 40, 7, 3), paint: "light", transform: "rotate(14 50 50)" })),
      { kind: "fill", d: box(24, 6, 10, 88, 5), paint: "player", transform: "rotate(14 50 50)" },
      { kind: "fill", d: box(66, 6, 10, 88, 5), paint: "player", transform: "rotate(14 50 50)" },
    ],
  },
  crown: {
    name: "crown",
    scale: 1.8,
    layers: [
      // The results' gold crown, in the card's color.
      { kind: "fill", d: "M6 33 L4 13 L15 22 L24 8 L33 22 L44 13 L42 33 Q42 36 39 36 L9 36 Q6 36 6 33 Z", paint: "player", transform: CROWN },
      { kind: "flat", d: "M10 26 L9 19 L14.5 23.5 Z", paint: "light", transform: CROWN },
      { kind: "fill", d: box(6, 28, 36, 8, 3), paint: "dark", transform: CROWN },
      { kind: "fill", d: circle(4, 13, 4), paint: "light", transform: CROWN },
      { kind: "fill", d: circle(24, 8, 4), paint: "light", transform: CROWN },
      { kind: "fill", d: circle(44, 13, 4), paint: "light", transform: CROWN },
    ],
  },
  trophy: {
    name: "trophy",
    layers: [
      { kind: "stroke", d: "M30 26 C14 24 14 46 34 48 M70 26 C86 24 86 46 66 48", paint: "player", width: 6 },
      { kind: "fill", d: "M26 14 H74 V34 Q74 60 50 62 Q26 60 26 34 Z", paint: "player" },
      { kind: "flat", d: "M33 20 H40 V36 Q40 48 46 54 Q33 50 33 36 Z", paint: "light" },
      { kind: "fill", d: "M44 61 H56 V74 H44 Z", paint: "dark" },
      { kind: "fill", d: box(28, 73, 44, 15, 4), paint: "player" },
      { kind: "fill", d: box(38, 77, 24, 7, 2), paint: "light" },
    ],
  },
};
