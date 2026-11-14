import { armSquares, homeProgress, lastTrackProgress, trackSquare, type LudoBoard } from "../../../shared/games/ludo/board";
import type { Progress } from "../../../shared/games/ludo/types";

/**
 * Where everything is on a Ludo board, in board units: the board is 100 across and 100 down, the same numbers the SVG's
 * viewBox and the pawns' percentages use. Pure: the art and every pawn's motion come from here.
 *
 * The board is a star of `arms` arms, 3 squares wide, round a middle polygon with a side 3 squares long (the classic
 * cross's 3 × 3 middle, a hexagon, an octagon), split into each arm's home triangle. Between each two arms is a yard
 * (the classic board's corner square), so the whole board is a square, a hexagon or an octagon with an arm's tip in the
 * middle of each side; each yard holds a base. Arms go clockwise; the board is turned so `bottomArm` (yours) points down, with your base at the bottom left, as on a
 * classic board in front of you.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * The bases between the arms, in squares: how big (radius), the gap left to the arms on either side, how far apart
 * the four pawns' spots are, and how big the pawns stand in them (a share of their size on the track). Bigger boards'
 * yards are narrower, so their bases are smaller; each sits in the middle of its yard, with its color all round it.
 */
const BASES: Readonly<Record<number, { radius: number; gap: number; spread: number; pawn: number }>> = {
  4: { radius: 2.35, gap: 0.65, spread: 0.62, pawn: 1 },
  6: { radius: 1.3, gap: 0.16, spread: 0.5, pawn: 0.82 },
  8: { radius: 0.72, gap: 0.16, spread: 0.3, pawn: 0.57 },
};
/**
 * Room left round the board's edge, in squares: none for the classic square board, whose card's border is its edge;
 * a little for a hexagon or an octagon, which draws its own outline.
 */
const MARGIN = { framed: 0, outlined: 0.35 } as const;
/** A spot's socket in a base, the size of the foot of the pawn standing in it, so the pawn hides it: in squares, at a track pawn's size. */
const SOCKET = 0.38;

/** One square to draw. */
export interface LudoCell {
  /** Its four corners, in order round it. */
  corners: Point[];
  center: Point;
  arm: number;
  /** A home column square (the arm's middle column, up to the centre). */
  lane: boolean;
  /** A track square's index round the track; null in a home column. */
  square: number | null;
}

export interface LudoLayout {
  board: LudoBoard;
  /** A square's side, in board units. */
  cell: number;
  cells: LudoCell[];
  /** Each track square's middle, by index round the track. */
  track: Point[];
  /** Per arm: its home column's squares from the tip inward. */
  lanes: Point[][];
  /** Per arm: its home triangle in the middle, and where its pawns home huddle: the biggest circle inside it (pawns home are drawn round its middle like pawns sharing a square, so they always fit). */
  homes: { corners: Point[]; center: Point; room: number }[];
  /** The classic square board fills its card, whose border is its edge; a hexagon or an octagon has no card and draws its own outline. */
  framed: boolean;
  /** The board's outline: a square, a hexagon or an octagon. */
  outline: Point[];
  /** Per arm: its sides and its end at the middle (3 squares wide, from the middle to its tip; its tip is on the board's edge). */
  armOutlines: Point[][];
  /** Per arm: its yard, between it and the next arm clockwise, out to the board's edge. */
  yards: Point[][];
  /** Per arm: its base in its yard, its four pawns' spots there, and how big each spot's socket is. */
  bases: { center: Point; radius: number; spots: Point[]; socket: number }[];
  /** How big pawns stand in a base, a share of their size on the track. */
  basePawn: number;
  /** Which way each arm points (radians, on screen), and its unit vectors: out along it, and across it toward the next arm. */
  axes: { angle: number; out: Point; across: Point }[];
}

const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });

/** The board for `board`, turned so `bottomArm` points down. */
export function ludoLayout(board: LudoBoard, bottomArm: number): LudoLayout {
  const { arms, armLength } = board;
  const half = Math.PI / arms;
  // The middle polygon: the distance to each side's middle (where an arm starts) and to its corners.
  const inner = 1.5 / Math.tan(half);
  const corner = 1.5 / Math.sin(half);
  const axes = Array.from({ length: arms }, (_, arm) => {
    const angle = Math.PI / 2 + ((arm - bottomArm) * 2 * Math.PI) / arms;
    return { angle, out: { x: Math.cos(angle), y: Math.sin(angle) }, across: { x: -Math.sin(angle), y: Math.cos(angle) } };
  });
  const polar = (angle: number, distance: number): Point => ({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance });

  // In squares, centred on the middle; scaled to the board's 100 units at the end.
  const cellAt = (arm: number, k: number, column: number): LudoCell => {
    const { out, across } = axes[arm]!;
    const center = add(add({ x: 0, y: 0 }, out, inner + k + 0.5), across, column);
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ].map(([a, b]) => add(add(center, out, a!), across, b!));
    return { corners, center, arm, lane: false, square: null };
  };

  const cells: LudoCell[] = [];
  const track: Point[] = [];
  const lanes: Point[][] = [];
  for (let arm = 0; arm < arms; arm++) {
    const first = arm * armSquares(board);
    // Outward along the column away from the next arm, round the tip's middle, back in along the column toward it.
    const run = [
      ...Array.from({ length: armLength }, (_, k) => cellAt(arm, k, -1)),
      cellAt(arm, armLength - 1, 0),
      ...Array.from({ length: armLength }, (_, i) => cellAt(arm, armLength - 1 - i, 1)),
    ];
    run.forEach((cell, i) => {
      cells.push({ ...cell, square: first + i });
      track[first + i] = cell.center;
    });
    const lane = Array.from({ length: armLength - 1 }, (_, i) => cellAt(arm, armLength - 2 - i, 0));
    cells.push(...lane.map((cell) => ({ ...cell, lane: true })));
    lanes.push(lane.map((cell) => cell.center));
  }

  // A home triangle's incircle: its radius is its area over half its edges' length.
  const homeRoom = (1.5 * inner) / (corner + 1.5);
  const homes = axes.map(({ angle, out }) => ({
    corners: [{ x: 0, y: 0 }, polar(angle - half, corner), polar(angle + half, corner)],
    center: add({ x: 0, y: 0 }, out, inner - homeRoom),
  }));

  // The board's edge runs across every arm's tip; its corners sit between the arms.
  const edge = inner + armLength;
  const vertex = (arm: number) => polar(axes[arm]!.angle + half, edge / Math.cos(half));
  const outline = axes.map((_, arm) => vertex(arm));
  const armOutlines = axes.map(({ out, across }) =>
    [
      [edge, -1.5],
      [inner, -1.5],
      [inner, 1.5],
      [edge, 1.5],
    ].map(([o, a]) => add(add({ x: 0, y: 0 }, out, o!), across, a!)),
  );
  const yards = axes.map(({ angle, out, across }, arm) => {
    const next = axes[(arm + 1) % arms]!;
    return [polar(angle + half, corner), add(add({ x: 0, y: 0 }, out, edge), across, 1.5), vertex(arm), add(add({ x: 0, y: 0 }, next.out, edge), next.across, -1.5)];
  });

  const look = BASES[arms] ?? BASES[8]!;
  const baseDistance = (look.radius + 1.5 + look.gap) / Math.sin(half);
  const bases = axes.map(({ angle }) => {
    const center = polar(angle + half, baseDistance);
    // Upright on screen, like the pawns standing in them: a 2 × 2 square of spots.
    const spots = [-1, 1].flatMap((dy) => [-1, 1].map((dx) => ({ x: center.x + dx * look.spread, y: center.y + dy * look.spread })));
    return { center, radius: look.radius, spots, socket: SOCKET * look.pawn };
  });

  // Fit it all into 100 × 100, centred.
  const points = [...outline, ...bases.flatMap((b) => [-1, 1].flatMap((s) => [add(b.center, { x: s * b.radius, y: 0 }), add(b.center, { x: 0, y: s * b.radius })]))];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const framed = arms === 4;
  const size = Math.max(maxX - minX, maxY - minY) + 2 * (framed ? MARGIN.framed : MARGIN.outlined);
  const scale = 100 / size;
  const shift = { x: 50 - ((minX + maxX) / 2) * scale, y: 50 - ((minY + maxY) / 2) * scale };
  const fit = (p: Point): Point => ({ x: shift.x + p.x * scale, y: shift.y + p.y * scale });

  return {
    board,
    cell: scale,
    cells: cells.map((c) => ({ ...c, corners: c.corners.map(fit), center: fit(c.center) })),
    track: track.map(fit),
    lanes: lanes.map((lane) => lane.map(fit)),
    homes: homes.map((h) => ({ corners: h.corners.map(fit), center: fit(h.center), room: homeRoom * scale })),
    framed,
    outline: outline.map(fit),
    armOutlines: armOutlines.map((o) => o.map(fit)),
    yards: yards.map((y) => y.map(fit)),
    bases: bases.map((b) => ({ center: fit(b.center), radius: b.radius * scale, spots: b.spots.map(fit), socket: b.socket * scale })),
    basePawn: look.pawn,
    axes,
  };
}

/** Where a pawn's progress puts it: its spot in its base, a track square, its home column, or the middle of its home triangle. */
export function spotOf(layout: LudoLayout, arm: number, pawn: number, progress: Progress): Point {
  const { board } = layout;
  if (progress < 0) return layout.bases[arm]!.spots[pawn]!;
  if (progress >= homeProgress(board)) return layout.homes[arm]!.center;
  const last = lastTrackProgress(board);
  if (progress > last) return layout.lanes[arm]![progress - last - 1]!;
  return layout.track[trackSquare(board, arm, progress)!]!;
}

/** The SVG path through `points`, closed round to the first unless `closed` is false. */
export const pathOf = (points: readonly Point[], closed = true) => `${points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("")}${closed ? "Z" : ""}`;

/**
 * Where each of `count` pawns sharing a square sits round its middle (in squares), and how big they are there: one in
 * the middle, two side by side, three in a triangle, four in a square, more in a 3 × 3 grid, smaller.
 */
export function clusterSpots(count: number): { offsets: Point[]; scale: number } {
  if (count <= 1) return { offsets: [{ x: 0, y: 0 }], scale: 1 };
  const reach = count <= 4 ? 0.22 : 0.3;
  const grid = count === 2 ? [[-1, 0], [1, 0]] : count === 3 ? [[-1, -1], [1, -1], [0, 1]] : count <= 4 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => [x, y]));
  return { offsets: grid.slice(0, count).map(([x, y]) => ({ x: x! * reach, y: y! * reach })), scale: count <= 2 ? 0.75 : count <= 4 ? 0.62 : 0.48 };
}
