import type { Ref } from "react";
import { TICTACTOE_CONFIG } from "../../shared/games/tictactoe/config";
import type { Seat, TicTacToeState } from "../../shared/games/tictactoe/types";
import { BoardCell } from "./BoardCell";
import { BoardFrame, type BoardEnding } from "./BoardFrame";

export type { BoardEnding } from "./BoardFrame";

interface BoardProps {
  game: TicTacToeState;
  /** Player id for each seat, so marks show in that player's color. */
  seatColors: readonly [number, number];
  /** Seat allowed to play now, or null for a read-only board. */
  playableSeat: Seat | null;
  /** The winner is looking: winning marks grow and glow (everyone else just sees the line). */
  celebrate?: boolean;
  /** Set once the match is over: a win fills the board with the winner's color and the result tag sits on its edge. */
  ending?: BoardEnding | null;
  /** Celebration style options (defaults are today's look). */
  markMotion?: "glow" | "hop";
  countUp?: boolean;
  /** When the result tag lands, in ms after the match ended (for the count-up). */
  tagLandsAtMs?: number;
  /** The board element, for effects that need cell positions on screen (sparks along the line). */
  ref?: Ref<HTMLDivElement>;
  onPlay?(cell: number): void;
}

const MARK_NAMES = ["X", "O"] as const;

/** The tic-tac-toe board: nine cells in the shared board frame. */
export function Board({
  game,
  seatColors,
  playableSeat,
  celebrate = false,
  ending = null,
  markMotion = "glow",
  countUp = false,
  tagLandsAtMs = 0,
  ref,
  onPlay,
}: BoardProps) {
  const { boardSize } = TICTACTOE_CONFIG;
  const canPlay = playableSeat !== null && game.turn === playableSeat && game.winner === null && !game.isDraw;
  const winnerId = ending?.winnerId ?? null;
  return (
    // White outlined card like the rest of the app; only the cells you can tap get a lip.
    <BoardFrame
      ref={ref}
      size={boardSize}
      spacing="roomy"
      winningLine={game.winningLine}
      isDraw={game.isDraw}
      ending={ending}
      countUp={countUp}
      tagLandsAtMs={tagLandsAtMs}
    >
      {game.board.map((value, index) => {
        const row = Math.floor(index / boardSize) + 1;
        const col = (index % boardSize) + 1;
        return (
          <BoardCell
            key={index}
            index={index}
            value={value}
            colorIndex={value === null ? null : seatColors[value]}
            label={`Row ${row}, column ${col}: ${value === null ? "empty" : MARK_NAMES[value]}`}
            playable={canPlay && value === null}
            winning={game.winningLine?.includes(index) ?? false}
            fresh={game.lastMove === index}
            celebrate={celebrate}
            faded={winnerId !== null && !(game.winningLine?.includes(index) ?? false)}
            motion={markMotion}
            hopOrder={game.winningLine?.indexOf(index) ?? 0}
            onPlay={(cell) => onPlay?.(cell)}
          />
        );
      })}
    </BoardFrame>
  );
}
