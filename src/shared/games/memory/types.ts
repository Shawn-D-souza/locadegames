import type { PictureId } from "./pictures";

/** A seat in a Memory game: 0 … players - 1, in turn order (seat 0 turns first). The room maps seats to players. */
export type MemorySeat = number;

/** One pair's look: a picture in a color (a player color's index). The same picture in another color is another pair. */
export interface MemoryFace {
  picture: PictureId;
  color: number;
}

/** The latest card turned: the turn's first, or its second with the first (shown face up until they turn back). */
export interface MemoryMove {
  seat: MemorySeat;
  /** The cards turned this turn so far (1 or 2), in order. */
  cards: number[];
  /** Their faces (indexes into `faces`), so phones can show a miss before it turns back. */
  faces: number[];
  /** The second card matched the first: the pair is theirs and they turn again. */
  matched: boolean;
}

export interface MemoryState {
  /** Cards across and down. Cards are numbered row by row. */
  cols: number;
  rows: number;
  /** The game's pairs: each face is on two cards. */
  faces: MemoryFace[];
  /**
   * Per face: how many of its two cards haven't been turned yet. A card gets its face the first time it's turned,
   * drawn from these with the server's fresh random number: the same as a shuffled deck, but nothing ahead is known to
   * anyone, the server included. Phones never get it (`view`).
   */
  undealt: number[];
  /** Per card: its face once it has been turned, or null. Phones see only cards face up (`view`). */
  cards: (number | null)[];
  /** Per card: who found its pair, or null while it's still in play. */
  taken: (MemorySeat | null)[];
  /** The card turned this turn, waiting for its partner; null between turns. */
  open: number | null;
  /** Whose turn it is; -1 once the game is over. */
  turn: MemorySeat;
  /** Cards turned so far: tells one card from the next (a timeout names it). */
  moves: number;
  /** Per seat: quit (✕ or left the room). Their pairs stay, grey; they are skipped and can't place above anyone who stayed. */
  quit: boolean[];
  /** Seats in the order they quit (the last to quit ranks highest of the quitters). */
  quitOrder: MemorySeat[];
  lastMove: MemoryMove | null;
  over: boolean;
}
