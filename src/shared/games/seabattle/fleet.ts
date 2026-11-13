import { CELL_COUNT, FLEET_SIZE, SEABATTLE_CONFIG } from "./config";
import type { Fleet, Ship } from "./types";

/** Fleets: where ships lie, and the rule that they are straight and never overlap (they may touch: owner decision 2026-11-13). */

const SIZE = SEABATTLE_CONFIG.boardSize;

export const rowOf = (cell: number) => Math.floor(cell / SIZE);
export const colOf = (cell: number) => cell % SIZE;
export const shipLength = (index: number) => SEABATTLE_CONFIG.fleet[index]!;

/** The cells a ship covers, or null if it runs off the board. */
export function shipCells(ship: Ship, length: number): number[] | null {
  if (!Number.isInteger(ship.cell) || ship.cell < 0 || ship.cell >= CELL_COUNT) return null;
  const row = rowOf(ship.cell);
  const col = colOf(ship.cell);
  if ((ship.vertical ? row : col) + length > SIZE) return null;
  return Array.from({ length }, (_, i) => ship.cell + i * (ship.vertical ? SIZE : 1));
}

/** A fleet being placed: each ship where it lies, or null while it isn't on the board yet. */
export type FleetDraft = readonly (Ship | null)[];

/** Every cell covered by the fleet's ships (skipping `skip`, a ship being moved). */
function covered(fleet: FleetDraft, skip: number | null): Set<number> {
  const out = new Set<number>();
  fleet.forEach((ship, index) => {
    if (ship && index !== skip) for (const cell of shipCells(ship, shipLength(index)) ?? []) out.add(cell);
  });
  return out;
}

/** Whether ship `index` may lie at `ship` among the rest of `fleet`: on the board, and on no other ship (side by side is fine). */
export function fitsAt(fleet: FleetDraft, index: number, ship: Ship): boolean {
  const cells = shipCells(ship, shipLength(index));
  if (!cells) return false;
  const taken = covered(fleet, index);
  return cells.every((cell) => !taken.has(cell));
}

/** A whole, legal fleet: every ship once, each on the board, none on another. */
export function isValidFleet(fleet: readonly Ship[]): boolean {
  if (fleet.length !== FLEET_SIZE) return false;
  return fleet.every((ship, index) => fitsAt(fleet.slice(0, index), index, ship));
}

/** Which ship of the fleet covers `cell`, or -1. */
export function shipAt(fleet: readonly Ship[], cell: number): number {
  return fleet.findIndex((ship, index) => shipCells(ship, shipLength(index))?.includes(cell));
}

/**
 * A whole legal fleet from a partly placed one: the ships already down stay (in fleet order, each one that lies on no
 * earlier one), the rest go in random spots, biggest first, each picked evenly from every spot it fits. `random` gives
 * numbers in [0, 1). If the ships already down leave a ship nowhere to go (very rare), it starts again from scratch.
 */
export function completeFleet(partial: FleetDraft, random: () => number): Fleet {
  const kept: (Ship | null)[] = [];
  for (let index = 0; index < FLEET_SIZE; index++) {
    const ship = partial[index] ?? null;
    kept.push(ship && fitsAt(kept, index, ship) ? ship : null);
  }
  for (let attempt = 0; ; attempt++) {
    const fleet = attempt === 0 ? [...kept] : kept.map(() => null);
    if (fillFleet(fleet, random)) return fleet as Fleet;
  }
}

/** Puts every missing ship of `fleet` in a random spot where it fits; false if one has nowhere to go. */
function fillFleet(fleet: (Ship | null)[], random: () => number): boolean {
  for (let index = 0; index < FLEET_SIZE; index++) {
    if (fleet[index]) continue;
    const spots: Ship[] = [];
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      for (const vertical of [false, true]) {
        if (fitsAt(fleet, index, { cell, vertical })) spots.push({ cell, vertical });
      }
    }
    if (spots.length === 0) return false;
    fleet[index] = spots[Math.floor(random() * spots.length)]!;
  }
  return true;
}

/** A random legal fleet (a seeded `random` on the server, so it never shows on any phone). */
export function randomFleet(random: () => number): Fleet {
  return completeFleet([], random);
}
