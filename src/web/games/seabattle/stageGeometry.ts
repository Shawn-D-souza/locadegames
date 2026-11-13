import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { colOf, rowOf } from "../../../shared/games/seabattle/fleet";
import { seaTiles } from "../../../theme";

/**
 * The firing stage: both players' waters, the one being fired at big and the other small, with the fleets' strip
 * between them and the shooter's cannon on the small one. Everything is measured in big-board widths (`--sea-l` on
 * screen), so the same numbers place it all on any screen. The other player's waters are always the far board (on
 * top, or on the right in landscape), yours the near one; they trade sizes, never places.
 */

const SIZE = SEABATTLE_CONFIG.boardSize;

export const STAGE = {
  /** The small board, as a share of the big one. */
  small: 0.34,
  /** Between a board and the strip. */
  gap: 0.04,
  /** The strip: their ships in a row by their waters, yours by yours. */
  strip: 0.1,
  /** A ship's height in the strip, and the room between two ships in a row. */
  stripShip: 0.042,
  stripSpace: 0.03,
  /** The cannon across, how far its muzzle reaches from its middle (a share of its size), and a cannonball. */
  cannon: 0.22,
  muzzle: 0.36,
  ball: 0.06,
} as const;

/** The stage's long side: the big board, a gap, the strip, a gap, the small board. Its short side is one board. */
export const STAGE_LENGTH = 1 + 2 * STAGE.gap + STAGE.strip + STAGE.small;

export interface Point {
  x: number;
  y: number;
}

/** Where a board sits (its top-left corner) and how big it is drawn. */
export interface Place extends Point {
  scale: number;
}

export interface StageLayout {
  width: number;
  height: number;
  /** Their waters (top, or right in landscape) and yours (bottom, or left). */
  far: Place;
  near: Place;
  /** The strip's corner: in landscape it turns a quarter round it, its rows becoming columns (theirs on the right). */
  strip: Point;
}

/** Where everything sits: in portrait the boards stack (theirs on top), in landscape they stand side by side (yours on the left). */
export function stageLayout(landscape: boolean, farBig: boolean): StageLayout {
  const { small: k, gap: g, strip: s } = STAGE;
  const off = (1 - k) / 2;
  if (!landscape) {
    return farBig
      ? { width: 1, height: STAGE_LENGTH, far: { x: 0, y: 0, scale: 1 }, strip: { x: 0, y: 1 + g }, near: { x: off, y: 1 + 2 * g + s, scale: k } }
      : { width: 1, height: STAGE_LENGTH, far: { x: off, y: 0, scale: k }, strip: { x: 0, y: k + g }, near: { x: 0, y: k + 2 * g + s, scale: 1 } };
  }
  return farBig
    ? { width: STAGE_LENGTH, height: 1, near: { x: 0, y: off, scale: k }, strip: { x: k + g + s, y: 0 }, far: { x: k + 2 * g + s, y: 0, scale: 1 } }
    : { width: STAGE_LENGTH, height: 1, near: { x: 0, y: 0, scale: 1 }, strip: { x: 1 + g + s, y: 0 }, far: { x: 1 + 2 * g + s, y: off, scale: k } };
}

/** The middle of tile `index` (a row or column) across a board drawn one wide: the water round the tiles, then tiles and the water between them. */
function tileMiddle(index: number): number {
  const gap = seaTiles.gap / 100;
  const tile = (1 - (SIZE + 1) * gap) / SIZE;
  return gap + index * (tile + gap) + tile / 2;
}

/** The middle of a cell of the board at `place`. */
export function cellMiddle(place: Place, cell: number): Point {
  return { x: place.x + place.scale * tileMiddle(colOf(cell)), y: place.y + place.scale * tileMiddle(rowOf(cell)) };
}

/** The middle of the board at `place`. */
export function boardMiddle(place: Place): Point {
  return { x: place.x + place.scale / 2, y: place.y + place.scale / 2 };
}

/** Which way from `from` to `to`, in degrees clockwise from straight up (a cannon is drawn pointing up). */
function heading(from: Point, to: Point): number {
  return (Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI;
}

export interface CannonAim {
  /** Its middle (the small board's). */
  at: Point;
  /** Where it points, within half a turn of the big board's middle, so it never swings the long way round. */
  angle: number;
  /** Where a ball leaves it. */
  muzzle: Point;
}

/** The shooter's cannon, on the small board, pointing at `cell` of the big board (or at its middle). */
export function cannonAim(small: Place, big: Place, cell: number | null): CannonAim {
  const at = boardMiddle(small);
  const rest = heading(at, boardMiddle(big));
  const raw = cell === null ? rest : heading(at, cellMiddle(big, cell));
  const angle = rest + ((((raw - rest + 180) % 360) + 360) % 360) - 180;
  const reach = STAGE.cannon * STAGE.muzzle;
  const rad = (angle * Math.PI) / 180;
  return { at, angle, muzzle: { x: at.x + reach * Math.sin(rad), y: at.y - reach * Math.cos(rad) } };
}
