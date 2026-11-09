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
  /** Seat allowed to play now, or null for a read-only board (watching, or the match is over). */
  playableSeat: Seat | null;
  /** The winner is looking: the winning marks celebrate (everyone else just sees the line). */
  celebrate: boolean;
  /** Set once the match is over: shown on the board itself. */
  ending: BoardEnding | null;
  /** When the result tag lands, in ms after the match ended (its points count up then). */
  tagLandsAtMs: number;
  /** The board element; its first children are the squares a win line runs through (the sparks find them there). */
  ref?: Ref<HTMLDivElement>;
  onPlay(move: number): void;
}

/** How wide the match screen's column gets: tic-tac-toe's board, or a board of small boards (wider, and beside the seat cards in landscape). */
export type MatchLayout = "board" | "largeBoard";

/** A turn-based game's look and sound on the match screen. Each game adds one to `MATCH_LOOKS`. */
export interface MatchLook<State extends GameState> {
  Board: ComponentType<MatchBoardProps<State>>;
  layout: MatchLayout;
  /** Marks on the board: a new one means a move landed. */
  movesPlayed(game: State): number;
  /** The sounds of the move that just landed (its mark, and anything it did), for `viewer`: your seat, or null watching. */
  moveSteps(previous: State, game: State, viewer: Seat | null): SoundStep[];
  /** The mark of the last move, which the ending plays as it starts. */
  lastMarkSound(game: State): { sound: SoundName; variant: number } | null;
  /** Felt when the other player's mark lands: your turn. */
  opponentMoved: HapticName;
}
