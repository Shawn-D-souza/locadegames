import type { Seat } from "../../shared/games/types";

/**
 * Which pieces carry the ring in a 1v1 game whose pieces are only told apart by color (4 in a Row's discs, Checkers'
 * pieces; owner decision: the same ones every game, never whoever happens to play second): your own, like the dot on
 * your pawn in the other board games. Watching, the second seat's.
 */
export const isRinged = (seat: Seat, viewer: Seat | null): boolean => (viewer === null ? seat === 1 : seat === viewer);
