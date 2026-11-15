import { useState, type PointerEvent, type RefObject } from "react";
import { crownRow, jumpedBetween, legalMoves, rowOf } from "../../../shared/games/checkers/rules";
import type { CheckersMove, CheckersState, Seat } from "../../../shared/games/checkers/types";
import { CHECKERS_CONFIG } from "../../../shared/games/checkers/config";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSoundSequence } from "../../services/soundPlayer";
import { landsAtMs } from "./moveTiming";
import { moveSoundSteps } from "./sounds";
import { pointOf, squareUnder, type Point } from "./view";

/** The piece you picked up and the squares it has landed on so far this turn (a chain of jumps is made one hop at a time). */
export interface Pick {
  /** The move count it was picked at: once that changes, it's gone. */
  plies: number;
  from: number;
  path: number[];
  /** Where its last hop started on screen, when it was dragged there (else the square before). */
  start: Point | null;
  /** The whole move is made and sent: it shows until the server's answer comes. */
  sent: boolean;
}

interface Drag {
  pointerId: number;
  /** Where the piece's top-left corner is, in squares. */
  at: Point;
  /** Where the finger holds the piece, from its top-left corner. */
  grip: Point;
}

interface CheckersInputOptions {
  game: CheckersState;
  /** The seat that may move now, or null (not your turn, watching, or a move is still playing out). */
  seat: Seat | null;
  flipped: boolean;
  pick: Pick | null;
  setPick(pick: Pick | null): void;
  /** The squares' layer: pointer positions are read across it. */
  layer: RefObject<HTMLElement | null>;
  onMove(move: CheckersMove): void;
}

const startsWith = (path: readonly number[], prefix: readonly number[]) => prefix.every((square, i) => path[i] === square);

/**
 * Moving a piece with a finger or the mouse: tap one of yours to pick it up (the squares it can go to show a dot), then
 * tap one of those; or drag it there. A chain of jumps is made one hop at a time with the same piece; the move is sent
 * once it can go no further. A capture must be taken (owner decision), so then only the pieces that can capture pick up.
 */
export function useCheckersInput({ game, seat, flipped, pick: held, setPick, layer, onMove }: CheckersInputOptions) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const pick = held && held.plies === game.plies ? held : null;
  const enabled = seat !== null && !pick?.sent;
  const legal = enabled ? legalMoves(game.squares, seat) : [];
  const movable = new Set(legal.map((move) => move.from));
  const mustJump = legal.some((move) => jumpedBetween(move.from, move.path[0]!) !== null);
  const options = pick ? legal.filter((move) => move.from === pick.from && move.path.length > pick.path.length && startsWith(move.path, pick.path)) : [];
  const targets = new Set(options.map((move) => move.path[pick!.path.length]!));
  const inChain = pick !== null && pick.path.length > 0;
  /** Where the picked piece stands now. */
  const at = pick ? (pick.path.at(-1) ?? pick.from) : null;

  const pointAt = (event: PointerEvent<HTMLElement>): Point | null => {
    const area = layer.current?.getBoundingClientRect();
    if (!area || area.width === 0) return null;
    const { size } = CHECKERS_CONFIG;
    return { x: ((event.clientX - area.left) / area.width) * size, y: ((event.clientY - area.top) / area.height) * size };
  };

  const hop = (square: number, from: Point | null) => {
    if (!pick || seat === null) return;
    const path = [...pick.path, square];
    const rest = options.filter((move) => move.path[path.length - 1] === square);
    const done = rest.some((move) => move.path.length === path.length);
    const jumped = jumpedBetween(at!, square) !== null;
    const piece = game.squares[pick.from];
    const crowned = done && piece !== null && piece !== undefined && !piece.king && rowOf(square) === crownRow(seat);
    // This hop's sound and feel, as it lands (`moveSoundSteps` of a one-hop move, its take for its place in a chain).
    const steps = moveSoundSteps({ path: [square], captured: jumped ? [square] : [], crowned });
    playSoundSequence(steps.map((step) => (step.sound === "checkersCapture" ? { ...step, variant: Math.min(path.length - 1, 3) } : step)));
    playHapticSequence([{ haptic: crowned ? "checkersCrowned" : jumped ? "checkersYourJump" : "checkersYourStep", at: landsAtMs(1) }]);
    setPick({ ...pick, path, start: from, sent: done });
    if (done) onMove({ from: pick.from, path });
  };

  const press = (square: number | null, point: Point | null, pointerId: number | null) => {
    if (!enabled || square === null) return;
    const grab = (from: number) => {
      if (pointerId === null || point === null) return;
      const corner = pointOf(from, flipped);
      setDrag({ pointerId, at: corner, grip: { x: point.x - corner.x, y: point.y - corner.y } });
    };
    if (inChain) {
      if (targets.has(square)) hop(square, null);
      else if (square === at) grab(square);
      return;
    }
    if (movable.has(square)) {
      if (pick?.from !== square) playHaptic("checkersPicked");
      setPick({ plies: game.plies, from: square, path: [], start: null, sent: false });
      grab(square);
    } else if (targets.has(square)) {
      hop(square, null);
    } else {
      // One of yours that can't move (another must capture): a small no.
      if (game.squares[square]?.seat === seat) playHaptic("refused");
      setPick(null);
    }
  };

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
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
      if (square !== null && targets.has(square)) hop(square, drag.at);
    },
    onPointerCancel() {
      setDrag(null);
    },
  };

  return {
    pick,
    /** The piece being dragged: where it is, and the square it was lifted from. */
    drag: drag && enabled && at !== null ? { at: drag.at, from: at } : null,
    movable,
    mustJump,
    targets,
    inChain,
    /** For a button per square (keyboards, screen readers, the iPhone's tap tick): the same as a tap on it. */
    tap: (square: number) => press(square, null, null),
    handlers,
  };
}
