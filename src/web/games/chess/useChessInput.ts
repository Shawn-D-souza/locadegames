import { useState, type PointerEvent, type RefObject } from "react";
import { CHESS_CONFIG } from "../../../shared/games/chess/config";
import { legalMoves } from "../../../shared/games/chess/rules";
import type { ChessMove, ChessState, PromotionKind, Seat } from "../../../shared/games/chess/types";
import { playHaptic } from "../../services/hapticPlayer";
import { pointOf, squareUnder, type Point } from "./view";

interface Drag {
  pointerId: number;
  /** Where the piece's top-left corner is, in squares. */
  at: Point;
  /** Where the finger holds the piece, from its top-left corner. */
  grip: Point;
}

/** A pawn put down on the far row: it waits there for you to pick what it becomes. */
export interface PendingPromotion {
  from: number;
  to: number;
  start: Point | null;
}

interface ChessInputOptions {
  game: ChessState;
  /** The seat that may move now, or null (not your turn, watching, or a move is still playing out). */
  seat: Seat | null;
  flipped: boolean;
  /** The squares' layer: pointer positions are read across it. */
  layer: RefObject<HTMLElement | null>;
  /** A whole move is made (`start`: where it was let go, when dragged). */
  onMove(move: ChessMove, start: Point | null): void;
}

/**
 * Moving a piece with a finger or the mouse: tap one of yours to pick it up (the squares it can go to show a dot, a
 * ring round a piece it can take), then tap one of those; or drag it there. Castling is the king's move two squares
 * toward the rook. A pawn put down on the far row asks what it becomes (owner decision: you pick).
 */
export function useChessInput({ game, seat, flipped, layer, onMove }: ChessInputOptions) {
  const [held, setHeld] = useState<{ plies: number; from: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [heldPromotion, setPromotion] = useState<(PendingPromotion & { plies: number }) | null>(null);
  const enabled = seat !== null;
  const pick = enabled && held && held.plies === game.plies ? held.from : null;
  const promotion = enabled && heldPromotion && heldPromotion.plies === game.plies ? heldPromotion : null;
  const legal = enabled ? legalMoves(game) : [];
  const movable = new Set(legal.map((move) => move.from));
  const targets = new Set(pick === null ? [] : legal.filter((move) => move.from === pick).map((move) => move.to));

  const pointAt = (event: PointerEvent<HTMLElement>): Point | null => {
    const area = layer.current?.getBoundingClientRect();
    if (!area || area.width === 0) return null;
    const { size } = CHESS_CONFIG;
    return { x: ((event.clientX - area.left) / area.width) * size, y: ((event.clientY - area.top) / area.height) * size };
  };

  const go = (to: number, start: Point | null) => {
    if (pick === null) return;
    const options = legal.filter((move) => move.from === pick && move.to === to);
    if (options.length === 0) return;
    if (options.length > 1) {
      // A promotion: the four choices share the square; the picker asks which.
      setPromotion({ plies: game.plies, from: pick, to, start });
      return;
    }
    setHeld(null);
    onMove(options[0]!, start);
  };

  const press = (square: number | null, point: Point | null, pointerId: number | null) => {
    if (!enabled || square === null || promotion) return;
    if (pick !== null && targets.has(square)) {
      go(square, null);
      return;
    }
    if (movable.has(square)) {
      if (pick !== square) playHaptic("chessPicked");
      setHeld({ plies: game.plies, from: square });
      if (pointerId !== null && point !== null) {
        const corner = pointOf(square, flipped);
        setDrag({ pointerId, at: corner, grip: { x: point.x - corner.x, y: point.y - corner.y } });
      }
      return;
    }
    // One of yours that can't move (it's blocked, or pinned, or your king is in check): a small no.
    if (game.squares[square]?.seat === seat) playHaptic("refused");
    setHeld(null);
  };

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || promotion || (event.pointerType === "mouse" && event.button !== 0)) return;
      const point = pointAt(event);
      if (point === null) return;
      // Keeps the finger's moves coming here once it slides off the board.
      event.currentTarget.setPointerCapture(event.pointerId);
      press(squareUnder(point, flipped), point, event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const point = pointAt(event);
      if (point) setDrag({ ...drag, at: { x: point.x - drag.grip.x, y: point.y - drag.grip.y } });
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      setDrag(null);
      const point = pointAt(event);
      const square = point && squareUnder(point, flipped);
      // Let go on a square it can go to: it goes there from where it was let go. Anywhere else it goes back (a tap
      // leaves it picked up).
      if (square !== null && targets.has(square)) go(square, drag.at);
    },
    onPointerCancel() {
      setDrag(null);
    },
  };

  return {
    pick,
    /** The piece being dragged: where it is now. */
    drag: drag && pick !== null ? { at: drag.at, from: pick } : null,
    movable,
    targets,
    promotion,
    /** The pawn becomes `kind`: the move is made. */
    promote(kind: PromotionKind) {
      if (!promotion) return;
      setPromotion(null);
      setHeld(null);
      onMove({ from: promotion.from, to: promotion.to, promotion: kind }, promotion.start);
    },
    /** Changed your mind: the pawn goes back, still picked up. */
    cancelPromotion: () => setPromotion(null),
    /** For a button per square (keyboards, screen readers, the iPhone's tap tick): the same as a tap on it. */
    tap: (square: number) => press(square, null, null),
    handlers,
  };
}
