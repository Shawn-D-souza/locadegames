import type { PlayedMove } from "../../../shared/games/chess/types";
import { durations } from "../../../theme";

/**
 * When the parts of a move happen as it plays out on screen, in ms from its start: the board's slide, the piece it
 * takes shrinking away, a promoted pawn turning into its new piece, their sounds and feels all read them, so they land together.
 */

/** The piece (and the castling rook beside it) lands on its square. */
export const landsAtMs = durations.chessSlide;

/** The piece taken shrinks away as the mover arrives, finishing as it lands. */
export const takenAtMs = Math.max(0, durations.chessSlide - durations.checkerTaken / 2);

/** How long the whole move takes to play out: the slide, then a promoted pawn's new piece popping on. */
export const moveMs = (move: Pick<PlayedMove, "promotion">) => landsAtMs + (move.promotion ? durations.slow : 0);
