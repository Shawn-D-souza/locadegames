import { seededRandom } from "../../random";
import { POOL_CONFIG } from "./config";
import type { PoolBall, PoolSeat } from "./types";

const { ballRadius: R, rackGap, table } = POOL_CONFIG;
const { length: L, width: W, headSpotX, footSpotX } = table;
const MID_Y = W / 2;
/** Balls this close (middle to middle) touch: a ball put back needs at least this much room. */
const ROOM = 2 * R + rackGap;

/** Balls each for `players` players (owner decision: 7 for 2, 4 for 3, 3 for 4). */
export function ballsEach(players: number): number {
  return POOL_CONFIG.ballsEach[players] ?? 3;
}

/**
 * The rack's spots, the front one on the foot spot: a triangle of rows of 1, 2, 3, 4, 5 (15 balls), or for 13 the last
 * row without its two corners. The black's spot is the middle of the third row, as in 8-ball.
 */
function rackSpots(count: number): { spots: { x: number; y: number }[]; black: number } {
  const rowGap = (ROOM * Math.sqrt(3)) / 2;
  const spots: { x: number; y: number }[] = [];
  for (let row = 0; spots.length < count; row++) {
    const inRow = Array.from({ length: row + 1 }, (_, m) => ({ x: footSpotX + row * rowGap, y: MID_Y + (m - row / 2) * ROOM }));
    // The last row of a 13-ball rack: its middle three.
    const left = count - spots.length;
    spots.push(...(left < inRow.length ? inRow.slice((inRow.length - left) / 2, (inRow.length - left) / 2 + left) : inRow));
  }
  return { spots, black: 4 };
}

/**
 * The balls for a new game: the cue ball on the head spot, the black in the middle of the rack, and everyone's balls
 * in the rest of the rack in an order picked from `seed` (the server's random number), so nobody's balls always sit
 * at the front.
 */
export function rack(players: number, seed: number): PoolBall[] {
  const each = ballsEach(players);
  const { spots, black } = rackSpots(players * each + 1);
  const free = spots.filter((_, i) => i !== black);
  const random = seededRandom(seed);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [free[i], free[j]] = [free[j]!, free[i]!];
  }
  return [
    { owner: "cue", x: headSpotX, y: MID_Y, on: true },
    { owner: "black", ...spots[black]!, on: true },
    ...free.map((spot, i) => ({ owner: Math.floor(i / each) as PoolSeat, ...spot, on: true })),
  ];
}

/** Whether a ball could stand at `x, y` without touching a ball on the table (but `except`) or the cushions. */
function roomAt(balls: readonly PoolBall[], except: number, x: number, y: number): boolean {
  if (x < R || x > L - R || y < R || y > W - R) return false;
  return balls.every((b, i) => i === except || !b.on || (b.x - x) ** 2 + (b.y - y) ** 2 >= ROOM * ROOM);
}

/**
 * The free spot nearest `x, y` for ball `except` (a scratched cue ball going back where it was, the black back on the
 * foot spot): there if nothing is in the way, else the nearest point on a fine grid around it.
 */
export function freeSpot(balls: readonly PoolBall[], except: number, x: number, y: number): { x: number; y: number } {
  if (roomAt(balls, except, x, y)) return { x, y };
  const grid = R / 2;
  for (let ring = 1; ring < (2 * L) / grid; ring++) {
    let best: { x: number; y: number; d: number } | null = null;
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const px = x + i * grid;
        const py = y + j * grid;
        const d = i * i + j * j;
        if ((best === null || d < best.d) && roomAt(balls, except, px, py)) best = { x: px, y: py, d };
      }
    }
    if (best) return { x: best.x, y: best.y };
  }
  return { x, y };
}

/** Where a black sunk too early goes back: the foot spot, or the nearest free spot to it. */
export const blackSpot = (balls: readonly PoolBall[]) => freeSpot(balls, 1, footSpotX, MID_Y);
