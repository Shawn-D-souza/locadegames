/**
 * A seat in a Dots Clash game: 0 … players - 1, in turn order (who picks and plays first is seat 0). The room maps
 * seats to players.
 */
export type DotsSeat = number;

/** pick: everyone picks a starting cell at the same time, hidden until all have (nothing explodes) · play: the game itself. */
export type DotsPhase = "pick" | "play";

export interface DotsClashState {
  /** Cells per side; the board wraps on all four sides. Cell `row × size + col`. */
  size: number;
  /** Who owns each cell (a seat), or null while empty. A quitter keeps theirs: they show grey and any explosion can take them. */
  owners: (DotsSeat | null)[];
  /** Dots on each cell (0 when empty, 1–3 at rest). */
  dots: number[];
  phase: DotsPhase;
  /** Whose turn it is; -1 while everyone picks, and once the game is over. */
  turn: DotsSeat;
  /**
   * Turns played so far, plus each time the picks were settled (the starts revealed, or a clash sending players back to
   * pick again): tells one turn (or round of picks) from the next, and timeouts name it. A single pick doesn't count.
   */
  moves: number;
  /**
   * Per seat, while picking: the cell they chose (null: not yet). Secret until everyone has picked (owner decision: an
   * open pick lets the others surround you), so the room view hides where (`HIDDEN_PICK`) and only shows who has.
   */
  picks: (number | null)[];
  /** Per seat: their last pick was the same cell as someone else's, so they pick again (nobody learns where the others are). */
  clashed: boolean[];
  /** Players have gone out this many times: one chain taking several out counts once, each quit counts on its own. */
  exits: number;
  /** Per seat: which exit took them out (no cells left, or quit), null while still in. Same number = same chain: a shared place. */
  outAt: (number | null)[];
  /** Per seat: quit (✕ or left the room). Their cells stay, grey; they are skipped. */
  quit: boolean[];
  /** The last tap, so phones can replay its chain, and how many waves that chain had; null after the starts are revealed. */
  lastMove: { seat: DotsSeat; cell: number; waves: number } | null;
  /** The last player standing, once over (null if everyone quit). */
  winner: DotsSeat | null;
  over: boolean;
}
