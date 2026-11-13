import type { ComponentType, Ref } from "react";
import type { GameState } from "../../shared/games/registry";
import type { Seat } from "../../shared/games/types";
import type { BoardEnding } from "../components/BoardFrame";
import type { HapticName } from "../haptics/hapticBook";
import type { SoundName, SoundStep } from "../sound/soundBook";

/** What the match screen hands a turn-based game's board. */
export interface MatchBoardProps<State> {
  game: State;
  /** Player id for each seat, so marks show in that player's color. */
  seatColors: readonly [number, number];
  /** Each seat's player's name (Sea Battle names whose waters are whose). */
  seatNames: readonly [string, string];
  /** Seat allowed to play now, or null for a read-only board (watching, or the match is over). */
  playableSeat: Seat | null;
  /** Whose phone this is: their seat, or null watching (Sea Battle shows your own fleet and the other's waters). */
  viewerSeat: Seat | null;
  /** Local time the turn now running ends (Sea Battle sends the fleet on screen just before placing runs out). */
  turnEndsAt: number;
  /** The winner is looking: the winning marks celebrate (everyone else just sees the line). */
  celebrate: boolean;
  /** Set once the match is over: shown on the board itself. */
  ending: BoardEnding | null;
  /** When the result tag lands, in ms after the match ended (its points count up then). */
  tagLandsAtMs: number;
  /** The board element; its first children are the squares a win line runs through (the sparks find them there). */
  ref?: Ref<HTMLDivElement>;
  /** A move as the game reads it (a cell for most games; Sea Battle also sends a whole fleet). */
  onPlay(move: unknown): void;
  /**
   * A board that plays moves out before their result shows (Sea Battle's cannonballs) says who must act as it shows
   * it, so the lit cards and the screen's wash change with it, never ahead of it.
   */
  onShownToMove(seats: readonly Seat[]): void;
  /**
   * A board that plays moves out (`MatchLook.playsMovesOut`) says when the move that ended the match has been shown
   * (Sea Battle: its ball is down; at once if none was in the air), so the screen's ending waits for it.
   */
  onLastMoveShown(): void;
}

/**
 * How wide the match screen's column gets: tic-tac-toe's board, a board of small boards (wider, and beside the seat
 * cards in landscape), or two boards (Sea Battle: the waters being fired at big, the other small beside them).
 */
export type MatchLayout = "board" | "largeBoard" | "twoBoards";

/** A turn-based game's look and sound on the match screen. Each game adds one to `MATCH_LOOKS`. */
export interface MatchLook<State extends GameState> {
  Board: ComponentType<MatchBoardProps<State>>;
  layout: MatchLayout;
  /** The cards show each player's X or O (or, false, their avatar: a game without those pieces). */
  pieces: boolean;
  /** Big seat cards, or slim chips in one row beside the corner ✕ (a board that needs the screen's height: Sea Battle). */
  cards: "full" | "slim";
  /** Who must act now: whose turn it is, or both while both act at once (Sea Battle's placing); none once over. Their cards are lit. */
  toMove(game: State): Seat[];
  /** The cells a win's line runs through (the winner's sparks fly off it), or null. */
  winningLine(game: State): readonly number[] | null;
  /** Marks on the board: a new one means a move landed. */
  movesPlayed(game: State): number;
  /** The sounds of the move that just landed (its mark, and anything it did), for `viewer`: your seat, or null watching. */
  moveSteps(previous: State, game: State, viewer: Seat | null): SoundStep[];
  /** The mark of the last move, which the ending plays as it starts. */
  lastMarkSound(game: State): { sound: SoundName; variant: number } | null;
  /** Felt when the other player's mark lands: your turn (null: the board feels its own moves, Sea Battle's on its stage). */
  opponentMoved: HapticName | null;
  /**
   * Its board plays each move out before its result shows (Sea Battle's cannonballs): when a match ends by a move,
   * the screen holds its ending until the board says that move has been shown (`onLastMoveShown`).
   */
  playsMovesOut?: boolean;
}
