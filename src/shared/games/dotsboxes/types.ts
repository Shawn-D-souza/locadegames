/** A seat in a Dots & Boxes game: 0 … players - 1, in turn order (seat 0 draws first). The room maps seats to players. */
export type BoxesSeat = number;

export interface DotsBoxesState {
  /** Boxes per side (a square of `size + 1` × `size + 1` dots). Lines and boxes are numbered as in `board.ts`. */
  size: number;
  /** Per line: drawn yet. Nobody owns a line; only the boxes are won. */
  drawn: boolean[];
  /** Who won each box (a seat), or null while open. A quitter keeps theirs: they show grey and don't count. */
  boxes: (BoxesSeat | null)[];
  /** Whose turn it is; -1 once the game is over. */
  turn: BoxesSeat;
  /** Lines drawn so far: tells one turn from the next (a box won and drawing again is a new turn), and timeouts name it. */
  moves: number;
  /** Per seat: quit (✕ or left the room). Their boxes stay, grey; they are skipped and can't place above anyone who stayed. */
  quit: boolean[];
  /** Seats in the order they quit (the last to quit ranks highest of the quitters). */
  quitOrder: BoxesSeat[];
  /** The last line, who drew it and the boxes it won (0, 1 or 2), so phones can show it; null before the first. */
  lastMove: { seat: BoxesSeat; line: number; boxes: number[] } | null;
  over: boolean;
}
