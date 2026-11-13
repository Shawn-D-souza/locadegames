import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { colOf, fitsAt, rowOf, shipLength, type FleetDraft } from "../../../shared/games/seabattle/fleet";
import type { Ship } from "../../../shared/games/seabattle/types";

/** Placing, pure: where a dragged ship lands, which cell it was picked up by, turning it, and which ships overlap. */

const SIZE = SEABATTLE_CONFIG.boardSize;

/** Where ship `index` would lie with its `grab`-th cell under `row`, `col`, kept on the board. */
export function shipUnder(index: number, vertical: boolean, grab: number, row: number, col: number): Ship {
  const length = shipLength(index);
  const r = Math.min(Math.max(vertical ? row - grab : row, 0), SIZE - (vertical ? length : 1));
  const c = Math.min(Math.max(vertical ? col : col - grab, 0), SIZE - (vertical ? 1 : length));
  return { cell: r * SIZE + c, vertical };
}

/** Which of its cells a ship was grabbed by (0 = its first), from the cell under the finger. */
export function grabbedAt(ship: Ship, row: number, col: number, length: number): number {
  const along = ship.vertical ? row - rowOf(ship.cell) : col - colOf(ship.cell);
  return Math.min(Math.max(along, 0), length - 1);
}

/**
 * Ship `index` turned around its `grab`-th cell (the one pressed), pushed back onto the board if it would run off.
 * It always turns, even onto another ship (owner decision): the overlap shows until it's moved.
 */
export function turnedShip(ship: Ship, index: number, grab: number): Ship {
  const pivot = ship.cell + grab * (ship.vertical ? SIZE : 1);
  return shipUnder(index, !ship.vertical, grab, rowOf(pivot), colOf(pivot));
}

/** The ships lying on another one (they can't be sent like that). */
export function overlapping(fleet: FleetDraft): Set<number> {
  const out = new Set<number>();
  fleet.forEach((ship, index) => {
    if (ship && !fitsAt(fleet, index, ship)) out.add(index);
  });
  return out;
}
