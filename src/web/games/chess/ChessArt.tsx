import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { PieceKind } from "../../../shared/games/chess/types";
import type { Seat } from "../../../shared/games/types";
import { playerStyle } from "../../utils/playerStyle";
import { ChessPiece } from "./ChessPiece";

const SIZE = 4;
const COLUMNS_STYLE: CSSProperties = { gridTemplateColumns: `repeat(${SIZE}, 1fr)` };

/** A corner of the board, row by row: the first player's knight (`N`) checks the other's king (`k`), a pawn (`P`) behind. */
const POSITION = ["..k.", "....", ".N..", "...P"].join("");
const PIECES: Record<string, { kind: PieceKind; seat: Seat }> = { k: { kind: "king", seat: 1 }, N: { kind: "knight", seat: 0 }, P: { kind: "pawn", seat: 0 } };
const CHECKED = POSITION.indexOf("k");

/**
 * A corner of the board up close, its squares to the outline (Checkers' tile shows its whole board, so the two can't be
 * taken for each other): a knight checking a king, whose square glows coral, in the first two player colors.
 */
export function ChessArt() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden="true">
      <div className="grid w-full overflow-hidden rounded-art-cell border-thin border-ink bg-white" style={COLUMNS_STYLE}>
        {[...POSITION].map((char, index) => {
          const dark = (Math.floor(index / SIZE) + index) % 2 === 1;
          const piece = PIECES[char];
          return (
            <span key={index} className={clsx("relative aspect-square", index === CHECKED ? "bg-chess-check" : dark && "bg-checker-art-square")}>
              {piece && (
                <span className="absolute inset-[4%]" style={playerStyle(piece.seat)}>
                  <ChessPiece kind={piece.kind} seat={piece.seat} viewer={null} plain className="size-full" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
