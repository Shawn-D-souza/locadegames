import { clsx } from "clsx";
import type { Ref } from "react";
import { TICTACTOE_CONFIG } from "../../shared/games/tictactoe/config";
import type { Seat, TicTacToeState } from "../../shared/games/tictactoe/types";
import { playerStyle } from "../utils/playerStyle";
import { BoardCell } from "./BoardCell";
import { ResultTag, type ResultTone } from "./ResultTag";
import { WinLine } from "./WinLine";

/** How the match ended for whoever is looking, shown on the board itself. */
export interface BoardEnding {
  tone: ResultTone;
  label: string;
  points: number | null;
  detail: string | null;
  /** The winner's player id (null for a draw); paints the board. */
  winnerId: number | null;
}

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
  // A finished match is shown on the board itself, so nothing on the screen moves: the last move lands with a thump
  // and a short freeze, then a win draws its line and the board fills with the winner's color; a draw shakes.
  const winnerId = ending?.winnerId ?? null;
  return (
    // White outlined card like the rest of the app; only the cells you can tap get a lip.
    <div
      ref={ref}
      className={clsx(
        "relative grid w-full max-w-board gap-3 rounded-card border-thin border-ink bg-white p-4",
        winnerId !== null ? "animate-board-win" : game.isDraw && "animate-board-draw",
      )}
      style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)`, ...(winnerId !== null ? playerStyle(winnerId) : {}) }}
      role="group"
      aria-label="Board"
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
      {game.winningLine && <WinLine cells={game.winningLine} />}
      {ending && (
        <ResultTag
          tone={ending.tone}
          label={ending.label}
          points={ending.points}
          detail={ending.detail}
          countUp={countUp}
          landsAtMs={tagLandsAtMs}
        />
      )}
    </div>
  );
}
