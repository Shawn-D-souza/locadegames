/**
 * What can be on a card: pictures from around the platform, in groups (owner's list). A game takes one or two from a
 * group, never a whole group, and never two pictures that look alike. Pure data, used by the server to pick a game's
 * pairs and by phones to draw them.
 */
export const PICTURE_GROUPS = {
  shapes: ["circle", "square", "triangle", "star", "heart", "moon"],
  marks: ["x", "o"],
  chess: ["king", "queen", "rook", "bishop", "knight", "pawn"],
  car: ["car"],
  head: ["head"],
  dice: ["die1", "die2", "die3", "die4", "die5", "die6"],
  cue: ["cue"],
  sea: ["ship", "cannon"],
  snakes: ["snake", "ladder"],
  awards: ["crown", "trophy"],
} as const;

export type PictureGroup = keyof typeof PICTURE_GROUPS;
export type PictureId = (typeof PICTURE_GROUPS)[PictureGroup][number];

export const GROUPS = Object.keys(PICTURE_GROUPS) as PictureGroup[];

/**
 * Pictures from different groups that look too alike to be in the same game (owner: no Ludo pawn beside the chess pawn,
 * and no balls of any kind beside the circle, so neither is in the list at all): a filled circle and the ring of an O,
 * the plain square and a one-pip die, the crown and the queen's coronet.
 */
export const LOOKALIKES: readonly (readonly [PictureId, PictureId])[] = [
  ["circle", "o"],
  ["square", "die1"],
  ["crown", "queen"],
];

/**
 * The colors a card can be: player colors by index (theme `playerColors`), in families of hues that sit close
 * together (red, maroon, pink · yellow, orange, brown · green, lime · blue, teal · purple). One picture in two colors
 * takes them from different families, so the two pairs are always told apart. Gray is left out: it's a quitter's grey.
 */
export const COLOR_FAMILIES: readonly (readonly number[])[] = [[0, 8, 6], [3, 5, 10], [2, 9], [1, 7], [4]];

export const CARD_COLORS: readonly number[] = COLOR_FAMILIES.flat();

export function familyOf(color: number): number {
  return COLOR_FAMILIES.findIndex((family) => family.includes(color));
}

export function groupOf(picture: PictureId): PictureGroup {
  return GROUPS.find((group) => (PICTURE_GROUPS[group] as readonly PictureId[]).includes(picture))!;
}

export function isPictureId(value: unknown): value is PictureId {
  return GROUPS.some((group) => (PICTURE_GROUPS[group] as readonly unknown[]).includes(value));
}
