import type { PieceKind } from "../../../shared/games/chess/types";

/**
 * The six pieces, drawn in a 100-unit box (our own drawing, no piece set copied): classic tournament-set silhouettes,
 * each a few smooth outlined parts in the player's color, standing on the same two-step base. Pure data, so the
 * pieces can be drawn anywhere.
 */
export interface PieceShape {
  /** Outlined parts in the player's color, back to front. */
  parts: readonly string[];
  /** Ink lines drawn on top (the knight's mane, the bishop's cut). */
  lines?: readonly string[];
  /** Ink dots (the knight's eye and nostril). */
  dots?: readonly string[];
}

/** A circle as a path, so every part is one kind of thing. */
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

/** A rounded bar across the piece, `width` wide and centered, its top at `y`. */
const bar = (width: number, y: number, height: number) => {
  const r = height / 2;
  return `M${50 - width / 2 + r} ${y} h${width - 2 * r} a${r} ${r} 0 0 1 0 ${height} h${-(width - 2 * r)} a${r} ${r} 0 0 1 0 ${-height} Z`;
};

/** The base every piece stands on: a wide foot and a narrower step on it (the pawn's a little smaller). */
const base = (width: number) => [
  `M${50 - width / 2} 91 v-4.5 q0 -4.5 4.5 -4.5 h${width - 9} q4.5 0 4.5 4.5 v4.5 Z`,
  bar(width - 14, 75, 8),
];

/** Where the band pressed into your own pieces runs: along the foot of the base. */
export const BAND = { y: 86.5, inset: 10 } as const;

/** How wide each piece's foot is (the band runs along it). */
export const BASE_WIDTH: Record<PieceKind, number> = { pawn: 54, rook: 62, knight: 62, bishop: 60, queen: 64, king: 64 };

export const PIECE_SHAPES: Record<PieceKind, PieceShape> = {
  pawn: {
    parts: ["M34 77 C34 66 41 60 43.5 53 L56.5 53 C59 60 66 66 66 77 Z", bar(30, 47, 7), circle(50, 34, 12.5), ...base(BASE_WIDTH.pawn)],
  },
  rook: {
    parts: [
      "M35 77 L38 44 L62 44 L65 77 Z",
      "M31 41 V17 h9 v6 h6 v-6 h8 v6 h6 v-6 h9 V41 Z",
      bar(40, 37.5, 7),
      ...base(BASE_WIDTH.rook),
    ],
  },
  knight: {
    parts: [
      // Facing left: the back of the neck, the poll and ear, the forehead down to the muzzle, the jaw, the chest.
      "M67 77 C71 64 74 50 72 39 C70 28 63 20 55 16.5 L52 6 L45 15 C37 17.5 30 23 26 30.5 C22.5 37 18.5 44 18 49.5 C17.5 55 21.5 58.5 26.5 57.5 C32 56.5 38 53 43.5 50.5 C41 58 36 66 35 77 Z",
      ...base(BASE_WIDTH.knight),
    ],
    lines: ["M57.5 21 C65 28.5 68.5 40 67 52", "M43.5 50.5 C47 48 50 44 51 40"],
    dots: [circle(38, 29.5, 3), circle(23.5, 47.5, 2)],
  },
  bishop: {
    parts: [
      "M37 77 C37 67 42.5 61 44.5 55 L55.5 55 C57.5 61 63 67 63 77 Z",
      circle(50, 11, 5),
      "M50 14.5 C61 22 66 31.5 63.5 40 C61.5 46 56.5 49.5 50 49.5 C43.5 49.5 38.5 46 36.5 40 C34 31.5 39 22 50 14.5 Z",
      bar(32, 48.5, 7),
      ...base(BASE_WIDTH.bishop),
    ],
    lines: ["M57 25 L47.5 36"],
  },
  queen: {
    parts: [
      "M33.5 77 C35.5 65 40.5 57 42.5 50 L57.5 50 C59.5 57 64.5 65 66.5 77 Z",
      "M34 47 L26 21 L35.5 34 L38 15 L44.5 30.5 L50 12 L55.5 30.5 L62 15 L64.5 34 L74 21 L66 47 Z",
      circle(26, 20, 4.5),
      circle(38, 14, 4.5),
      circle(50, 10.5, 4.5),
      circle(62, 14, 4.5),
      circle(74, 20, 4.5),
      bar(36, 44, 7),
      ...base(BASE_WIDTH.queen),
    ],
  },
  king: {
    parts: [
      "M46.5 6 h7 v6 h6 v7 h-6 v12 h-7 v-12 h-6 v-7 h6 Z",
      "M34 77 C36 65 41 58 43 51 L57 51 C59 58 64 65 66 77 Z",
      // The headdress: two rounded lobes meeting under the cross.
      "M33.5 47.5 C28.5 38 32 28.5 40.5 28.5 C45 28.5 48.5 31 50 34.5 C51.5 31 55 28.5 59.5 28.5 C68 28.5 71.5 38 66.5 47.5 Z",
      bar(38, 45, 7),
      ...base(BASE_WIDTH.king),
    ],
  },
};
