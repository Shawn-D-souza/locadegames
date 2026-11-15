import { FOURINAROW_CONFIG } from "../../../shared/games/fourinarow/config";
import { durations } from "../../../theme";

/**
 * How long a disc takes to fall into `row` (0 is the top) from just above the board, in ms. Under gravity the time
 * grows with the square root of the distance, so a disc dropped into an empty column takes the whole `discFall` and
 * one landing on a nearly full column is quick. The board's animation, the landing's sound and its feel all use it.
 */
/** When the bounce lands again, as shares of `discBounce` (the `disc-bounce` keyframes' 45% and 80%): its smaller clacks. */
export const DISC_BOUNCE = { landsAt: [0.45, 0.8] } as const;

export function fallMs(row: number): number {
  return Math.round(durations.discFall * Math.sqrt((row + 1) / FOURINAROW_CONFIG.rows));
}
