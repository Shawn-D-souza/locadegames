import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { SQUARE_COUNT } from "../../../shared/games/chess/config";
import { inCheck, isLight, kingSquare } from "../../../shared/games/chess/moves";
import { applyMove, isGameOver } from "../../../shared/games/chess/rules";
import type { ChessMove, ChessState, Piece, PieceKind, PromotionKind, Square } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import { BoardFrame } from "../../components/BoardFrame";
import { OPPONENT_VOLUME, WATCHING_VOLUME } from "../../hooks/useMatchSounds";
import { hapticTarget, playHapticSequence } from "../../services/hapticPlayer";
import { playSoundSequence } from "../../services/soundPlayer";
import { playerStyle } from "../../utils/playerStyle";
import type { MatchBoardProps } from "../matchLook";
import { ChessPiece } from "./ChessPiece";
import { ChessSquare, type Corner } from "./ChessSquare";
import { landsAtMs, moveMs, takenAtMs } from "./moveTiming";
import { MovingPiece } from "./MovingPiece";
import { PromotionPicker } from "./PromotionPicker";
import { moveSoundSteps } from "./sounds";
import { useChessInput } from "./useChessInput";
import { useMovePlayback } from "./useMovePlayback";
import { isFlipped, pointOf, squareDrawnAt, squareName, type Point } from "./view";

/** The squares drawn in the board's corners, by where they're drawn: rounded with the board's outline. */
const CORNERS: Partial<Record<number, Corner>> = { 0: "topLeft", 7: "topRight", 56: "bottomLeft", 63: "bottomRight" };

/** A piece moving over the squares: where from and to, and what it becomes as it lands (a promoted pawn). */
interface Mover {
  key: string;
  from?: Point;
  to: Point;
  piece: Piece;
  becomes: PromotionKind | null;
}

/**
 * Chess on the match screen: the 8 × 8 board in the shared frame (which holds the ending), turned round on the second
 * seat's phone so your pieces are at the bottom. Pick a piece up and put it down (a tap each, or a drag); a pawn on
 * the far row asks what it becomes. Every move plays out: its piece slides over, a piece it takes shrinks away, a
 * castling rook comes along, and the match's ending waits for the last one (`playsMovesOut`).
 */
export function ChessBoard({
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
}: MatchBoardProps<ChessState>) {
  const flipped = isFlipped(viewerSeat);
  const over = isGameOver(game);
  const { playing, playOwn } = useMovePlayback(game);
  const canPlay = playableSeat !== null && game.turn === playableSeat && !over && playing === null;
  const layer = useRef<HTMLDivElement>(null);
  const input = useChessInput({
    game,
    seat: canPlay ? playableSeat : null,
    flipped,
    layer,
    onMove(move: ChessMove, start: Point | null) {
      const played = applyMove(game, game.turn, move, 0);
      if (!played.ok || !played.state.lastMove) return;
      playOwn(played.state.lastMove, start);
      onPlay(move);
    },
  });

  // The cards stay on whoever moved until their move has played out; the ending waits for it too.
  const acting = playing ? String(playing.move.seat) : over ? "" : String(game.turn);
  useLayoutEffect(() => {
    onShownToMove(acting === "" ? [] : [Number(acting) as Seat]);
  }, [acting, onShownToMove]);
  useLayoutEffect(() => {
    if (over && playing === null) onLastMoveShown();
  }, [over, playing, onLastMoveShown]);

  // A move playing out is heard as it lands, and felt: your own as it sets down, the other player's as it has played
  // out (your turn; watchers feel none, and the move that ends the match lands into the ending's own thump).
  useEffect(() => {
    if (!playing) return;
    const { move, own } = playing;
    const volume = viewerSeat === null ? WATCHING_VOLUME : move.seat === viewerSeat ? 1 : OPPONENT_VOLUME;
    playSoundSequence(moveSoundSteps(move).map((step) => ({ ...step, volume })));
    if (own) {
      playHapticSequence([{ haptic: move.promotion ? "chessPromoted" : move.captured ? "chessYourCapture" : "chessYourMove", at: landsAtMs }]);
    } else if (viewerSeat !== null && move.seat !== viewerSeat && !over) {
      playHapticSequence([{ haptic: move.check ? "chessChecked" : move.captured ? "chessOpponentCaptured" : "chessOpponentMoved", at: moveMs(move) }]);
    }
    // Once per move played out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing?.key]);

  // What the board shows: the position before a move playing out (its pieces sliding over it), or the game as it is.
  let squares: readonly Square[] = game.squares;
  const hidden = new Set<number>();
  const movers: Mover[] = [];
  let taken: number | null = null;
  if (playing) {
    const { before, move, start } = playing;
    squares = before;
    hidden.add(move.from);
    movers.push({ key: `${playing.key}piece`, from: start ?? pointOf(move.from, flipped), to: pointOf(move.to, flipped), piece: before[move.from]!, becomes: move.promotion });
    if (move.castle) {
      hidden.add(move.castle.from);
      movers.push({ key: `${playing.key}rook`, from: pointOf(move.castle.from, flipped), to: pointOf(move.castle.to, flipped), piece: before[move.castle.from]!, becomes: null });
    }
    taken = move.captured?.square ?? null;
  } else if (input.drag) {
    hidden.add(input.drag.from);
    movers.push({ key: "drag", to: input.drag.at, piece: game.squares[input.drag.from]!, becomes: null });
  }

  const checked = !playing && inCheck(game.squares, game.turn) ? kingSquare(game.squares, game.turn) : null;
  const winner = over && game.winner !== null && ending !== null ? game.winner : null;
  const winnerSquares = winner === null ? [] : Array.from({ length: SQUARE_COUNT }, (_, i) => squareDrawnAt(i, flipped)).filter((s) => squares[s]?.seat === winner);
  // Every square you can tap now: a button each, for keyboards, screen readers and the iPhone's tap tick.
  const actionable = canPlay && !input.promotion ? [...new Set([...input.movable, ...input.targets])] : [];
  const pieceName = (piece: Piece) => `${seatNames[piece.seat]}'s ${piece.kind}`;

  return (
    <div className="relative w-full touch-none select-none" {...input.handlers}>
      <BoardFrame ref={ref} size={8} spacing="checker" winningLine={null} isDraw={game.isDraw} ending={ending} countUp tagLandsAtMs={tagLandsAtMs}>
        {Array.from({ length: SQUARE_COUNT }, (_, index) => {
          const square = squareDrawnAt(index, flipped);
          const piece = hidden.has(square) ? null : (squares[square] ?? null);
          return (
            <ChessSquare
              key={index}
              corner={CORNERS[index] ?? null}
              light={isLight(square)}
              piece={piece}
              colorIndex={piece ? seatColors[piece.seat] : square === input.pick && playableSeat !== null ? seatColors[playableSeat] : null}
              viewer={viewerSeat}
              label={`${squareName(square)}: ${piece ? pieceName(piece) : "empty"}`}
              check={square === checked}
              picked={square === input.pick}
              target={input.targets.has(square)}
              takenAtMs={square === taken ? takenAtMs : null}
              celebrate={celebrate && piece?.seat === winner}
              hopOrder={winnerSquares.indexOf(square)}
              faded={winner !== null && piece !== null && piece.seat !== winner}
            />
          );
        })}
        {/* Over the squares: the moving pieces, and the buttons. */}
        <div ref={layer} className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {actionable.map((square) => {
            const { x, y } = pointOf(square, flipped);
            const piece = game.squares[square];
            const takes = input.targets.has(square);
            return (
              <button
                key={square}
                ref={hapticTarget}
                type="button"
                className="rounded-control"
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={takes ? `Move to ${squareName(square)}` : piece ? `Pick up ${pieceName(piece)} on ${squareName(square)}` : `Move to ${squareName(square)}`}
                onClick={(event) => {
                  // Fingers and the mouse are handled by the board's area; a key press has no pointer.
                  if (event.detail === 0) input.tap(square);
                }}
              />
            );
          })}
          {movers.map((mover) => (
            <MovingPiece key={mover.key} from={mover.from} to={mover.to}>
              <span className="absolute inset-[6%]" style={playerStyle(seatColors[mover.piece.seat])}>
                {mover.becomes ? (
                  <PromotingPiece seat={mover.piece.seat} viewer={viewerSeat} becomes={mover.becomes} />
                ) : (
                  <ChessPiece kind={mover.piece.kind} seat={mover.piece.seat} viewer={viewerSeat} className="size-full" />
                )}
              </span>
            </MovingPiece>
          ))}
        </div>
        {input.promotion && playableSeat !== null && (
          <PromotionPicker seat={playableSeat} colorIndex={seatColors[playableSeat]} onPick={input.promote} onCancel={input.cancelPromotion} />
        )}
      </BoardFrame>
    </div>
  );
}

/** A pawn sliding to the far row: it shrinks away as it lands and its new piece pops on in its place. */
function PromotingPiece({ seat, viewer, becomes }: { seat: Seat; viewer: Seat | null; becomes: PieceKind }) {
  const at = { "--taken-at": `${landsAtMs}ms`, "--crown-at": `${landsAtMs}ms` } as CSSProperties;
  return (
    <span className="relative block size-full" style={at}>
      <span className="absolute inset-0 animate-checker-taken">
        <ChessPiece kind="pawn" seat={seat} viewer={viewer} className="size-full" />
      </span>
      <span className="absolute inset-0 animate-checker-crown">
        <ChessPiece kind={becomes} seat={seat} viewer={viewer} className="size-full" />
      </span>
    </span>
  );
}
