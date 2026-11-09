import { BOARD_COUNT, ULTIMATE_CONFIG } from "../../../shared/games/ultimate/config";
import { isGameOver } from "../../../shared/games/ultimate/rules";
import type { UltimateState } from "../../../shared/games/ultimate/types";
import { BoardFrame } from "../../components/BoardFrame";
import type { MatchBoardProps } from "../matchLook";
import { UltimateSmallBoard } from "./UltimateSmallBoard";

/**
 * The big board: nine small boards in the shared board frame as one continuous grid, so the 81 cells get every pixel
 * (thin lines between cells, thick ones between small boards). A win's line runs through three small boards.
 */
export function UltimateBoard({ game, seatColors, playableSeat, celebrate, ending, tagLandsAtMs, ref, onPlay }: MatchBoardProps<UltimateState>) {
  const yourTurn = playableSeat !== null && game.turn === playableSeat && !isGameOver(game) ? playableSeat : null;
  const finished = ending !== null && ending.winnerId !== null;
  return (
    <BoardFrame
      ref={ref}
      size={ULTIMATE_CONFIG.boardSize}
      spacing="flush"
      winningLine={game.winningLine}
      isDraw={game.isDraw}
      ending={ending}
      countUp
      tagLandsAtMs={tagLandsAtMs}
    >
      {Array.from({ length: BOARD_COUNT }, (_, board) => {
        const onLine = game.winningLine?.includes(board) ?? false;
        return (
          <UltimateSmallBoard
            key={board}
            game={game}
            board={board}
            seatColors={seatColors}
            yourTurn={yourTurn}
            winning={finished && onLine}
            faded={finished && !onLine}
            celebrate={celebrate}
            hopOrder={game.winningLine?.indexOf(board) ?? 0}
            onPlay={onPlay}
          />
        );
      })}
    </BoardFrame>
  );
}
