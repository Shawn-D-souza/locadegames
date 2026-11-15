import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SQUARE_COUNT } from "../../../shared/games/checkers/config";
import { columnOf, crownRow, isDark, isGameOver, jumpedBetween, rowOf } from "../../../shared/games/checkers/rules";
import type { CheckersState, Piece, Square } from "../../../shared/games/checkers/types";
import type { Seat } from "../../../shared/games/types";
import { BoardFrame } from "../../components/BoardFrame";
import { OPPONENT_VOLUME, WATCHING_VOLUME } from "../../hooks/useMatchSounds";
import { hapticTarget, playHapticSequence } from "../../services/hapticPlayer";
import { playSoundSequence } from "../../services/soundPlayer";
import { playerStyle } from "../../utils/playerStyle";
import type { MatchBoardProps } from "../matchLook";
import { Checker } from "./Checker";
import { CheckersSquare, type Corner } from "./CheckersSquare";
import { landsAtMs, moveMs, takenAtMs } from "./moveTiming";
import { MovingChecker } from "./MovingChecker";
import { moveSoundSteps } from "./sounds";
import { useCheckersInput, type Pick } from "./useCheckersInput";
import { useMoveReplay } from "./useMoveReplay";
import { isFlipped, pointOf, squareDrawnAt, type Point } from "./view";

/** The squares drawn in the board's corners, by where they're drawn: rounded with the board's outline. */
const CORNERS: Partial<Record<number, Corner>> = { 0: "topLeft", 7: "topRight", 56: "bottomLeft", 63: "bottomRight" };

/** The piece moving over the squares: where it goes, and whether its crown pops on as it arrives. */
interface Mover {
  key: string;
  route: Point[];
  piece: Piece;
  crownAtMs: number | null;
}

/**
 * Checkers on the match screen: the 8 × 8 board in the shared frame (which holds the ending), turned round on the second
 * seat's phone so your pieces are at the bottom. Pick a piece up and put it down (a tap each, or a drag); a chain of
 * jumps goes a hop at a time. The other player's moves play out: the piece slides along its path, jumped pieces
 * shrinking away as it passes, and the match's ending waits for the last one (`playsMovesOut`).
 */
export function CheckersBoard({
  game,
  seatColors,
  seatNames,
  playableSeat,
  viewerSeat,
  celebrate,
  ending,
  tagLandsAtMs,
  ref,
  onPlay,
  onShownToMove,
  onLastMoveShown,
}: MatchBoardProps<CheckersState>) {
  const flipped = isFlipped(viewerSeat);
  const over = isGameOver(game);
  const [held, setHeld] = useState<Pick | null>(null);
  const sent = held?.sent ? { plies: held.plies, move: { from: held.from, path: held.path } } : null;
  const replay = useMoveReplay(game, sent);
  const canPlay = playableSeat !== null && game.turn === playableSeat && !over && replay === null;
  const layer = useRef<HTMLDivElement>(null);
  const input = useCheckersInput({ game, seat: canPlay ? playableSeat : null, flipped, pick: held, setPick: setHeld, layer, onMove: onPlay });

  // The cards stay on whoever moved until their move has played out; the ending waits for it too.
  const acting = replay ? String(replay.move.seat) : over ? "" : String(game.turn);
  useLayoutEffect(() => {
    onShownToMove(acting === "" ? [] : [Number(acting) as Seat]);
  }, [acting, onShownToMove]);
  useLayoutEffect(() => {
    if (over && replay === null) onLastMoveShown();
  }, [over, replay, onLastMoveShown]);

  // A move played out is heard hop by hop, and felt as it lands when it's the other player's (your turn; watchers feel
  // none, and the move that ends the match lands into the ending's own thump).
  useEffect(() => {
    if (!replay) return;
    const { move } = replay;
    const volume = viewerSeat === null ? WATCHING_VOLUME : move.seat === viewerSeat ? 1 : OPPONENT_VOLUME;
    playSoundSequence(moveSoundSteps(move).map((step) => ({ ...step, volume })));
    if (viewerSeat !== null && move.seat !== viewerSeat && !over) {
      playHapticSequence([{ haptic: move.captured.length ? "checkersOpponentJumped" : "checkersOpponentMoved", at: moveMs(move) }]);
    }
    // Once per move played out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay?.plies]);

  // What the board shows: the position before a move playing out, or your own move as you make it.
  let squares: readonly Square[] = game.squares;
  const taken = new Map<number, number>();
  let hidden: number | null = null;
  let mover: Mover | null = null;
  if (replay) {
    const { before, move } = replay;
    squares = before;
    hidden = move.from;
    move.captured.forEach((square, i) => taken.set(square, takenAtMs(i)));
    mover = {
      key: `replay${replay.plies}`,
      route: [move.from, ...move.path].map((square) => pointOf(square, flipped)),
      piece: { ...before[move.from]!, king: before[move.from]!.king || move.crowned },
      crownAtMs: move.crowned ? landsAtMs(move.path.length) : null,
    };
  } else if (input.pick && input.pick.path.length > 0) {
    const { from, path, start, sent: made } = input.pick;
    hidden = from;
    let at = from;
    for (const square of path) {
      const jumped = jumpedBetween(at, square);
      if (jumped !== null) taken.set(jumped, takenAtMs(0));
      at = square;
    }
    const piece = game.squares[from]!;
    const crowned = made && !piece.king && rowOf(at) === crownRow(piece.seat);
    mover = {
      key: `hop${path.length}`,
      route: [start ?? pointOf(path.at(-2) ?? from, flipped), pointOf(at, flipped)],
      piece: { ...piece, king: piece.king || crowned },
      crownAtMs: crowned ? landsAtMs(1) : null,
    };
  }
  if (input.drag && input.pick) {
    hidden = input.pick.from;
    mover = { key: "drag", route: [input.drag.at], piece: game.squares[input.pick.from]!, crownAtMs: null };
  }

  const trailMove = replay?.move ?? (input.pick?.path.length ? null : game.lastMove);
  const trail = trailMove ? [trailMove.from, trailMove.path.at(-1)] : [];
  const picked = input.pick && !input.pick.sent ? (input.pick.path.at(-1) ?? input.pick.from) : null;
  const winners = over && game.winner !== null && ending !== null ? game.winner : null;
  const winnerSquares = winners === null ? [] : Array.from({ length: SQUARE_COUNT }, (_, i) => squareDrawnAt(i, flipped)).filter((s) => squares[s]?.seat === winners);
  // Every square you can tap now: a button each, for keyboards, screen readers and the iPhone's tap tick.
  const actionable = canPlay ? [...new Set([...(input.inChain ? [picked!] : input.movable), ...input.targets])] : [];
  const pieceName = (piece: Piece) => `${seatNames[piece.seat]}'s ${piece.king ? "king" : "piece"}`;

  return (
    <div className="relative w-full touch-none select-none" {...input.handlers}>
      <BoardFrame ref={ref} size={8} spacing="checker" winningLine={null} isDraw={game.isDraw} ending={ending} countUp tagLandsAtMs={tagLandsAtMs}>
        {Array.from({ length: SQUARE_COUNT }, (_, index) => {
          const square = squareDrawnAt(index, flipped);
          const piece = square === hidden ? null : (squares[square] ?? null);
          return (
            <CheckersSquare
              key={index}
              corner={CORNERS[index] ?? null}
              dark={isDark(square)}
              piece={piece}
              colorIndex={piece ? seatColors[piece.seat] : square === picked && playableSeat !== null ? seatColors[playableSeat] : null}
              viewer={viewerSeat}
              label={`Row ${rowOf(square) + 1}, column ${columnOf(square) + 1}: ${piece ? pieceName(piece) : "empty"}`}
              trail={trail.includes(square)}
              target={input.targets.has(square)}
              picked={square === picked}
              mustMove={input.mustJump && input.pick === null && input.movable.has(square)}
              takenAtMs={taken.get(square) ?? null}
              celebrate={celebrate && piece?.seat === winners}
              hopOrder={winnerSquares.indexOf(square)}
              faded={winners !== null && piece !== null && piece.seat !== winners}
            />
          );
        })}
        {/* Over the squares: the moving piece, and the buttons. */}
        <div ref={layer} className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {actionable.map((square) => {
            const { x, y } = pointOf(square, flipped);
            const piece = game.squares[square];
            return (
              <button
                key={square}
                ref={hapticTarget}
                type="button"
                className="rounded-control"
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={piece ? `Pick up ${pieceName(piece)} on row ${rowOf(square) + 1}, column ${columnOf(square) + 1}` : `Move to row ${rowOf(square) + 1}, column ${columnOf(square) + 1}`}
                onClick={(event) => {
                  // Fingers and the mouse are handled by the board's area; a key press has no pointer.
                  if (event.detail === 0) input.tap(square);
                }}
              />
            );
          })}
          {mover && (
            <MovingChecker key={mover.key} route={mover.route}>
              <span className="absolute inset-[10%]" style={playerStyle(seatColors[mover.piece.seat])}>
                <Checker seat={mover.piece.seat} viewer={viewerSeat} king={mover.piece.king} crownAtMs={mover.crownAtMs} className="size-full" />
              </span>
            </MovingChecker>
          )}
        </div>
      </BoardFrame>
    </div>
  );
}
