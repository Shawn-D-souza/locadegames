import { clsx } from "clsx";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FOURINAROW_CONFIG } from "../../../shared/games/fourinarow/config";
import { cellAt, landingRow, rowOf } from "../../../shared/games/fourinarow/rules";
import type { FourInARowState } from "../../../shared/games/fourinarow/types";
import { BoardFrame } from "../../components/BoardFrame";
import { hapticTarget, playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playerStyle } from "../../utils/playerStyle";
import type { MatchBoardProps } from "../matchLook";
import { Disc } from "./Disc";
import { fallMs } from "./drop";
import { FourInARowCell } from "./FourInARowCell";
import { useDropAim } from "./useDropAim";

const { columns, rows } = FOURINAROW_CONFIG;

/** The aiming row and the column buttons line up with the holes: the board's padding and outline on each side, the holes' gap between. */
const ALIGNED_CLASSES = "grid gap-1 px-[calc(var(--space-2)+var(--stroke-thin))]";
const COLUMNS_STYLE: CSSProperties = { gridTemplateColumns: `repeat(${columns}, 1fr)` };

/**
 * 4 in a Row on the match screen: a row above the board where your disc waits over the column you aim at, and the
 * board's 7 × 6 holes in the shared frame (which holds the win line and the ending). Discs fall in from that row, so
 * the other player's come from the same place as yours. While you aim, the column's empty holes light up.
 */
export function FourInARowBoard({ game, seatColors, seatNames, playableSeat, viewerSeat, celebrate, ending, tagLandsAtMs, ref, onPlay }: MatchBoardProps<FourInARowState>) {
  const over = game.winner !== null || game.isDraw;
  const canPlay = playableSeat !== null && game.turn === playableSeat && !over;
  const movesPlayed = game.cells.filter((cell) => cell !== null).length;
  const winnerId = ending?.winnerId ?? null;

  // Your disc stays over the column you dropped it in until the server's answer brings it down.
  const [sent, setSent] = useState<{ column: number; moves: number } | null>(null);
  const drop = (column: number) => {
    if (landingRow(game.cells, column) === null) return;
    playHaptic("fourInARowDiscDropped");
    setSent({ column, moves: movesPlayed });
    onPlay(column);
  };
  const { aim, handlers } = useDropAim({ columns, enabled: canPlay, onDrop: drop });
  const held = aim ?? (sent?.moves === movesPlayed ? sent.column : null);
  const aimRow = aim === null ? null : landingRow(game.cells, aim);
  const ghostCell = aim === null || aimRow === null ? null : cellAt(aimRow, aim);

  // A disc landing is felt as it lands: firmly if it's yours, lightly if it's the other's (your turn). Watchers feel
  // none, and the move that ends the match lands into the ending's own thump.
  const seenMoves = useRef(movesPlayed);
  useEffect(() => {
    if (movesPlayed > seenMoves.current && game.lastMove !== null && viewerSeat !== null && !over) {
      const mine = game.cells[game.lastMove] === viewerSeat;
      playHapticSequence([{ haptic: mine ? "fourInARowYourDiscLanded" : "fourInARowOpponentLanded", at: fallMs(rowOf(game.lastMove)) }]);
    }
    seenMoves.current = movesPlayed;
  }, [movesPlayed, game.lastMove, game.cells, viewerSeat, over]);

  return (
    <div className={clsx("relative flex w-full touch-none flex-col gap-1 select-none", canPlay && "cursor-pointer")} {...handlers}>
      {/* The aiming row: one hole tall, always there so the board never moves. */}
      <div className={ALIGNED_CLASSES} style={COLUMNS_STYLE} aria-hidden="true">
        <span className="col-start-1 row-start-1 aspect-square" />
        {held !== null && playableSeat !== null && (
          <span
            className="col-start-1 row-start-1 translate-x-[calc(var(--aim)*(100%+var(--space-1)))] transition-transform duration-fast ease-out"
            style={{ "--aim": held, ...playerStyle(seatColors[playableSeat]) } as CSSProperties}
          >
            <Disc seat={playableSeat} viewer={viewerSeat} className="size-full" />
          </span>
        )}
      </div>
      <BoardFrame
        ref={ref}
        size={columns}
        rows={rows}
        spacing="rack"
        winningLine={game.winningLine}
        isDraw={game.isDraw}
        ending={ending}
        countUp
        tagLandsAtMs={tagLandsAtMs}
      >
        {game.cells.map((value, index) => {
          const row = rowOf(index);
          const column = index % columns;
          const winning = game.winningLine?.includes(index) ?? false;
          return (
            <FourInARowCell
              key={index}
              value={value}
              colorIndex={value === null ? null : seatColors[value]}
              row={row}
              label={`Row ${row + 1}, column ${column + 1}: ${value === null ? "empty" : `${seatNames[value]}'s disc`}`}
              aimed={aim === column}
              viewer={viewerSeat}
              ghost={index === ghostCell && playableSeat !== null ? { seat: playableSeat, colorIndex: seatColors[playableSeat] } : null}
              winning={winning}
              fresh={game.lastMove === index}
              celebrate={celebrate}
              faded={winnerId !== null && !winning}
              hopOrder={game.winningLine?.indexOf(index) ?? 0}
            />
          );
        })}
      </BoardFrame>
      {/*
        A button per column over the whole area, for screen readers, keyboards and the iPhone's tap tick. Fingers and the
        mouse are handled by the area (`useDropAim`), so their clicks are left alone here; a key press has no pointer.
      */}
      {canPlay && (
        <div className={clsx("absolute inset-0", ALIGNED_CLASSES)} style={COLUMNS_STYLE}>
          {Array.from({ length: columns }, (_, column) => (
            <button
              key={column}
              ref={hapticTarget}
              type="button"
              className="rounded-control"
              disabled={landingRow(game.cells, column) === null}
              aria-label={`Drop in column ${column + 1}`}
              onClick={(event) => {
                if (event.detail === 0) drop(column);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
