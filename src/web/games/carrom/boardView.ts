import { CARROM_CONFIG } from "../../../shared/games/carrom/config";
import type { CarromSide } from "../../../shared/games/carrom/types";
import { CARROM_LOOK } from "./look";

const S = CARROM_CONFIG.board.size;
const MID = S / 2;
const FRAME = CARROM_LOOK.frame;

/** The whole board with its frame, in board units. */
export const BOARD_SPAN = S + 2 * FRAME;

/**
 * How the board sits on screen: square, as big as fits, turned so your side is at the bottom (owner decision: you always
 * shoot up the screen). `turn`: quarter turns clockwise (your side's number); `scale`: pixels per board unit.
 */
export interface BoardView {
  turn: CarromSide;
  scale: number;
}

/** Each quarter turn as a cosine and a sine (exact, no trigonometry). */
const TURNS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;

/** The board's size on screen (pixels): square. */
export const viewSize = (view: BoardView) => BOARD_SPAN * view.scale;

/** The biggest view that fits in `width` by `height` (pixels), turned so `side` is at the bottom. */
export function fitView(width: number, height: number, side: CarromSide): BoardView {
  return { turn: side, scale: Math.max(Math.min(width, height) / BOARD_SPAN, 0) };
}

/** The canvas transform taking board units to the screen's pixels (times `dpr`): for `ctx.setTransform`. */
export function boardTransform(view: BoardView, dpr: number): [number, number, number, number, number, number] {
  const s = view.scale * dpr;
  const [cos, sin] = TURNS[view.turn];
  // Turn round the board's middle, then shift it into the frame.
  const a = s * cos;
  const b = s * sin;
  const c = -s * sin;
  const d = s * cos;
  const centre = (FRAME + MID) * s;
  return [a, b, c, d, centre - (a * MID + c * MID), centre - (b * MID + d * MID)];
}

/** A point on the board on screen (pixels from the board's top left corner, frame included). */
export function toScreen(view: BoardView, x: number, y: number): { x: number; y: number } {
  const [cos, sin] = TURNS[view.turn];
  const u = x - MID;
  const v = y - MID;
  return { x: (FRAME + MID + u * cos - v * sin) * view.scale, y: (FRAME + MID + u * sin + v * cos) * view.scale };
}

/** A point on screen (pixels from the board's top left corner) in board units; `toScreen` backwards. */
export function toBoard(view: BoardView, px: number, py: number): { x: number; y: number } {
  const [cos, sin] = TURNS[view.turn];
  const u = px / view.scale - FRAME - MID;
  const v = py / view.scale - FRAME - MID;
  return { x: MID + u * cos + v * sin, y: MID - u * sin + v * cos };
}

/** A direction on the board as a direction on screen. */
export function screenDirection(view: BoardView, dx: number, dy: number): { x: number; y: number } {
  const [cos, sin] = TURNS[view.turn];
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}
