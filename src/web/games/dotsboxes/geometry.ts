import type { CSSProperties } from "react";
import { lineAt } from "../../../shared/games/dotsboxes/board";

/**
 * Where things sit on the board, as CSS lengths in boxes (`--box`: one box's width, set on the board from its own
 * width, so every size keeps its look). Pure.
 */

/** Room around the outer dots, in boxes: the outer lines' tap areas reach into it, and the card's corners clear the dots. */
export const MARGIN = 0.4;
/** A drawn line's thickness, an open line's (faint, so you see where lines can go) and a dot's size, in boxes. */
const DRAWN = 0.12;
const OPEN = 0.04;
const DOT = 0.24;

/** The board's one variable: a box's width, from the board's own width (`cqw`: the board is a size container). */
export function boardUnit(size: number): CSSProperties {
  return { "--box": `calc(100cqw / ${size + 2 * MARGIN})` } as CSSProperties;
}

/** `n` boxes as a length. */
const boxes = (n: number) => `calc(var(--box) * ${n})`;

/** A line's bar: along its two dots, `drawn` or open. */
export function lineStyle(size: number, line: number, drawn: boolean): CSSProperties {
  const { horizontal, row, col } = lineAt(size, line);
  const thick = drawn ? DRAWN : OPEN;
  // Drawn lines reach a little past their dots, so corners meet cleanly under the dots.
  const reach = drawn ? DRAWN / 2 : 0;
  const along = boxes(1 + 2 * reach);
  const across = boxes(thick);
  const left = boxes(MARGIN + col - (horizontal ? reach : thick / 2));
  const top = boxes(MARGIN + row - (horizontal ? thick / 2 : reach));
  return horizontal ? { left, top, width: along, height: across } : { left, top, width: across, height: along };
}

/**
 * A line's tap area: a diamond (a box wide) centred on the line, made of the halves of the two boxes beside it nearest
 * to it. They tile the board, so wherever a finger lands, the nearest line takes it.
 */
export function targetStyle(size: number, line: number): CSSProperties {
  const { horizontal, row, col } = lineAt(size, line);
  const x = MARGIN + col + (horizontal ? 0.5 : 0);
  const y = MARGIN + row + (horizontal ? 0 : 0.5);
  return { left: boxes(x - 0.5), top: boxes(y - 0.5), width: boxes(1), height: boxes(1) };
}

/** A dot at the corner (`row`, `col`). */
export function dotStyle(row: number, col: number): CSSProperties {
  return { left: boxes(MARGIN + col - DOT / 2), top: boxes(MARGIN + row - DOT / 2), width: boxes(DOT), height: boxes(DOT) };
}

/** A won box's color: the whole square, edge to edge (owner direction), its lines and dots drawn over it. */
export function boxStyle(size: number, box: number): CSSProperties {
  const row = Math.floor(box / size);
  const col = box % size;
  return { left: boxes(MARGIN + col), top: boxes(MARGIN + row), width: boxes(1), height: boxes(1) };
}
