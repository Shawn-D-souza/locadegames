/** The board's shape: a grid that wraps on all four sides, so every cell has exactly 4 neighbours. Pure. */

/** Up, right, down, left of `cell`, wrapping round the edges. */
export function neighbours(size: number, cell: number): [number, number, number, number] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const up = ((row - 1 + size) % size) * size + col;
  const down = ((row + 1) % size) * size + col;
  const left = row * size + ((col - 1 + size) % size);
  const right = row * size + ((col + 1) % size);
  return [up, right, down, left];
}
