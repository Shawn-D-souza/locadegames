import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { SMALL_CELLS, ULTIMATE_CONFIG } from "../../../shared/games/ultimate/config";
import { boardOf, isPlayableBoard, smallWinningLine } from "../../../shared/games/ultimate/rules";
import type { Seat, UltimateState } from "../../../shared/games/ultimate/types";
import { Mark } from "../../components/Mark";
import { WinLine } from "../../components/WinLine";
import { playerStyle } from "../../utils/playerStyle";
import { MARK_NAMES, POSITION_NAMES } from "./positions";
import { UltimateCell } from "./UltimateCell";

interface UltimateSmallBoardProps {
  game: UltimateState;
  board: number;
  seatColors: readonly [number, number];
  /** Your seat on your turn, else null: the empty cells of the boards you may play in take a tap. */
  yourTurn: Seat | null;
  /** After a win: this small board is on the winning line, or it fades back (the winner's color shows through). */
  winning: boolean;
  faded: boolean;
  /** The winner is looking: the big marks on the winning line jump one after another (`hopOrder`). */
  celebrate: boolean;
  hopOrder: number;
  onPlay(cell: number): void;
}

/**
 * The four corner boards round off with the big board's corner: the board itself fits inside the frame's outline, and
 * what fills it (cells, fill, tint) fits inside its own outline, one line tighter again.
 */
const CORNER_CLASSES: Partial<Record<number, { board: string; inner: string }>> = {
  0: {
    board: "rounded-tl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
    inner: "rounded-tl-[calc(var(--radius-small-board)-2*var(--stroke-thin))]",
  },
  2: {
    board: "rounded-tr-[calc(var(--radius-small-board)-var(--stroke-thin))]",
    inner: "rounded-tr-[calc(var(--radius-small-board)-2*var(--stroke-thin))]",
  },
  6: {
    board: "rounded-bl-[calc(var(--radius-small-board)-var(--stroke-thin))]",
    inner: "rounded-bl-[calc(var(--radius-small-board)-2*var(--stroke-thin))]",
  },
  8: {
    board: "rounded-br-[calc(var(--radius-small-board)-var(--stroke-thin))]",
    inner: "rounded-br-[calc(var(--radius-small-board)-2*var(--stroke-thin))]",
  },
};

/** A layer filling the board under its cells (with the corner's inner rounding). */
const LAYER_CLASSES = "pointer-events-none absolute inset-0";

/** The outline round the board to play in: over the board's own edge line (so its corner is the board's), so it reads as one frame. */
const OUTLINE_CLASSES = "pointer-events-none absolute -inset-(--stroke-thin) rounded-[inherit] border-outline-thick border-player-dark";

/** The big mark: stamps on as the board is won; on the winner's phone, the ones on the winning line jump. */
const BIG_MARK_CLASSES = {
  claim: "animate-claim",
  hop: "origin-[50%_90%] animate-mark-hop",
  claimHop: "origin-[50%_90%] animate-claim-hop",
} as const;

function bigMarkAnimation(claimed: boolean, hop: boolean) {
  if (claimed && hop) return BIG_MARK_CLASSES.claimHop;
  if (hop) return BIG_MARK_CLASSES.hop;
  return claimed ? BIG_MARK_CLASSES.claim : undefined;
}

/**
 * One small board of the continuous grid. Each draws half of the thick line round it, so the lines between small boards
 * come out twice as thick as those between cells. Where the player to move must play is lit in their tint with a thick
 * outline in their dark color: on your turn the whole highlight blinks (fading out completely); on theirs it stays, lighter. A won board gets the win
 * line through its three marks, then is filled with a lighter version of the winner's color with their big mark across it,
 * over the faded small marks and line; a full one just fades its marks.
 */
export function UltimateSmallBoard({ game, board, seatColors, yourTurn, winning, faded, celebrate, hopOrder, onPlay }: UltimateSmallBoardProps) {
  const owner = game.boards[board] ?? null;
  const lit = isPlayableBoard(game, board);
  const yours = lit && yourTurn !== null;
  // The move that just landed closed this board: its big mark stamps on now (not when the board is shown later).
  const justClosed = game.lastMove !== null && boardOf(game.lastMove) === board;
  const won = owner === 0 || owner === 1;
  const line = smallWinningLine(game, board);
  const corner = CORNER_CLASSES[board];
  const status = owner === null ? (lit ? "play here" : "open") : owner === "draw" ? "full, nobody won" : `won by ${MARK_NAMES[owner]}`;
  return (
    <div
      className={clsx("relative border-thin border-ink bg-white", corner?.board, faded && "animate-fade-back")}
      style={{ "--hop-order": hopOrder } as CSSProperties}
      role="group"
      aria-label={`${POSITION_NAMES[board]} square: ${status}`}
    >
      {won && (
        <div
          className={clsx(LAYER_CLASSES, corner?.inner, "bg-player-light", justClosed && "animate-claim-tint")}
          style={playerStyle(seatColors[owner])}
        />
      )}
      {lit && (
        <div
          className={clsx(LAYER_CLASSES, corner?.inner, "bg-player-tint", yours ? "animate-target-blink" : "opacity-target-waiting")}
          style={playerStyle(seatColors[game.turn])}
        />
      )}
      <div className={clsx("relative grid size-full grid-cols-3 overflow-clip", corner?.inner)}>
        {Array.from({ length: SMALL_CELLS }, (_, place) => {
          const cell = board * SMALL_CELLS + place;
          const value = game.cells[cell] ?? null;
          const playable = yours && value === null;
          return (
            <UltimateCell
              key={place}
              value={value}
              colorIndex={value !== null ? seatColors[value] : playable ? seatColors[yourTurn!] : null}
              place={place}
              label={`${POSITION_NAMES[board]} square, ${POSITION_NAMES[place]} cell: ${value === null ? "empty" : MARK_NAMES[value]}`}
              playable={playable}
              fresh={game.lastMove === cell}
              closed={owner !== null}
              onPlay={() => onPlay(cell)}
            />
          );
        })}
      </div>
      {lit && (
        <div
          className={clsx(OUTLINE_CLASSES, yours ? "animate-target-blink" : "opacity-target-waiting")}
          style={playerStyle(seatColors[game.turn])}
        />
      )}
      {line && (
        // Slashes through as the last mark lands, then fades back with the small marks under the big one.
        <div
          className={justClosed ? "animate-settle-back" : "opacity-closed-board"}
          style={{ ...playerStyle(seatColors[owner as Seat]), "--line-at": "var(--duration-slow)" } as CSSProperties}
        >
          <WinLine cells={line} size={ULTIMATE_CONFIG.boardSize} className="inset-0" animate={justClosed} />
        </div>
      )}
      {won && (
        <div className={clsx(LAYER_CLASSES, "flex items-center justify-center")} style={playerStyle(seatColors[owner])}>
          <Mark seat={owner} fit="full" className={clsx("size-full", bigMarkAnimation(justClosed, winning && celebrate))} />
        </div>
      )}
    </div>
  );
}
