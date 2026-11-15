/**
 * The board's shape, pure: `size` × `size` boxes between `size + 1` × `size + 1` dots. Lines are numbered horizontal
 * first, row by row (`row × size + col`, rows 0 … size), then vertical (`size × (size + 1) + row × (size + 1) + col`,
 * cols 0 … size). Box `row × size + col`. That line number is the move on the wire.
 */

export function lineCount(size: number): number {
  return 2 * size * (size + 1);
}

/** Where line `line` sits: horizontal or not, and the dot it starts from (its left or top end). */
export function lineAt(size: number, line: number): { horizontal: boolean; row: number; col: number } {
  const across = size * (size + 1);
  if (line < across) return { horizontal: true, row: Math.floor(line / size), col: line % size };
  const v = line - across;
  return { horizontal: false, row: Math.floor(v / (size + 1)), col: v % (size + 1) };
}

/** The four sides of box `box`: top, right, bottom, left. */
export function sidesOf(size: number, box: number): [number, number, number, number] {
  const row = Math.floor(box / size);
  const col = box % size;
  const across = size * (size + 1);
  const left = across + row * (size + 1) + col;
  return [row * size + col, left + 1, (row + 1) * size + col, left];
}

/** The one or two boxes line `line` is a side of. */
export function boxesBeside(size: number, line: number): number[] {
  const { horizontal, row, col } = lineAt(size, line);
  const boxes: number[] = [];
  if (horizontal) {
    if (row > 0) boxes.push((row - 1) * size + col);
    if (row < size) boxes.push(row * size + col);
  } else {
    if (col > 0) boxes.push(row * size + col - 1);
    if (col < size) boxes.push(row * size + col);
  }
  return boxes;
}

/** How many of box `box`'s sides are drawn. */
export function sidesDrawn(size: number, drawn: readonly boolean[], box: number): number {
  return sidesOf(size, box).reduce((sum, line) => sum + (drawn[line] ? 1 : 0), 0);
}
