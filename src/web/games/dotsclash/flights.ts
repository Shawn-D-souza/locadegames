import type { CSSProperties } from "react";

/**
 * How a burst's dots fly, up, right, down, left (the order of `neighbours`): one tile and the gap between. Each leaves
 * from where it sat in the tile's plus of 4 (`DotPips`), on the side it flies out of, so it goes dead straight to the
 * middle of the next tile: nothing jumps as the burst starts, and nothing twists (owner direction). Offsets are shares
 * of a tile.
 */
const PATHS = [
  { from: ["0%", "-26%"], to: ["0%", "calc(-100% - var(--board-gap))"] },
  { from: ["26%", "0%"], to: ["calc(100% + var(--board-gap))", "0%"] },
  { from: ["0%", "26%"], to: ["0%", "calc(100% + var(--board-gap))"] },
  { from: ["-26%", "0%"], to: ["calc(-100% - var(--board-gap))", "0%"] },
] as const;

/** A dot leaving a bursting tile for the neighbour in direction `dir`. */
export function outgoingFlight(dir: number): CSSProperties {
  const { from, to } = PATHS[dir]!;
  return { "--from-x": from[0], "--from-y": from[1], "--to-x": to[0], "--to-y": to[1] } as CSSProperties;
}

/** The same dot coming in on the board's far side (the board wraps): from beyond the edge to the middle of its tile. */
export function incomingFlight(dir: number): CSSProperties {
  const { from, to } = PATHS[dir]!;
  return {
    "--from-x": `calc(${from[0]} - ${to[0]})`,
    "--from-y": `calc(${from[1]} - ${to[1]})`,
    "--to-x": "0%",
    "--to-y": "0%",
  } as CSSProperties;
}

/** Whether a dot flying from `cell` in direction `dir` goes off the board's edge (and comes in on the other side). */
export function wrapsOff(size: number, cell: number, dir: number): boolean {
  const row = Math.floor(cell / size);
  const col = cell % size;
  return [row === 0, col === size - 1, row === size - 1, col === 0][dir]!;
}
