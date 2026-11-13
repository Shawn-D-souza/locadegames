import type { CSSProperties } from "react";
import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { colOf, rowOf } from "../../../shared/games/seabattle/fleet";
import type { Ship } from "../../../shared/games/seabattle/types";

/**
 * Where things sit on the waters, in percentages of the tiles' area (the board inside the water round its tiles): the
 * tiles are `--sea-tile-gap` apart, so column `c` starts at c × (100% + gap) / 8 and n tiles span n × (100% + gap) / 8 − gap.
 */

const SIZE = SEABATTLE_CONFIG.boardSize;
const GAP = "var(--sea-tile-gap)";
const start = (index: number) => `calc(${index} * (100% + ${GAP}) / ${SIZE})`;
const span = (count: number) => `calc(${count} * (100% + ${GAP}) / ${SIZE} - ${GAP})`;

/** A box over `across` × `down` tiles from `cell`. */
export function cellBox(cell: number, across = 1, down = 1): CSSProperties {
  return { left: start(colOf(cell)), top: start(rowOf(cell)), width: span(across), height: span(down) };
}

/** The tiles a ship lies on. */
export function shipBox(ship: Ship, length: number): CSSProperties {
  return ship.vertical ? cellBox(ship.cell, 1, length) : cellBox(ship.cell, length, 1);
}

/** The row and column under a point of the tiles' area on screen (may be off the board: outside 0–7). */
export function cellAtPoint(tiles: DOMRect, x: number, y: number): { row: number; col: number } {
  return { row: Math.floor(((y - tiles.top) / tiles.height) * SIZE), col: Math.floor(((x - tiles.left) / tiles.width) * SIZE) };
}
