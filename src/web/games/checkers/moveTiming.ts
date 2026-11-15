import type { PlayedMove } from "../../../shared/games/checkers/types";
import { durations } from "../../../theme";

/**
 * When the parts of a move happen as it plays out on screen, in ms from its start: the board's slide, the jumped
 * pieces shrinking away, the crown popping on, their sounds and feels all read them, so they land together.
 */

/** The piece lands on the `hop`-th square of its path (1 is the first). */
export const landsAtMs = (hop: number) => hop * durations.checkerHop;

/** The `index`-th piece taken (0 is the first) shrinks away as the jumping piece passes over it, half way along its jump. */
export const takenAtMs = (index: number) => index * durations.checkerHop + durations.checkerHop / 2;

/** How long the whole move takes to play out: every hop, then a man reaching the far row gets its crown. */
export const moveMs = (move: Pick<PlayedMove, "path" | "crowned">) => landsAtMs(move.path.length) + (move.crowned ? durations.slow : 0);
