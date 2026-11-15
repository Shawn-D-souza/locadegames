import type { CarromShot } from "../../../shared/games/carrom/types";

/**
 * Development only: a playtest can line up its next shots (`window.loadedCarromShots = [{ table, at, dx, dy }]`): the
 * coins put where it wants them (`[x, y, on]` per coin, in the game's order) and the striker placed and aimed at what
 * it placed, so it reaches its moments (a pocket, the queen, a foul) at once. The power still comes from the pull. The
 * dev server (`npm run dev:server`) accepts the table; production builds never send it and the production server
 * ignores it.
 */
export interface LoadedCarromShot {
  table?: [number, number, boolean][];
  at: number;
  dx: number;
  dy: number;
  power?: number;
}

declare global {
  interface Window {
    loadedCarromShots?: LoadedCarromShot[];
  }
}

/** What letting go sends: the shot as aimed, or in development the next loaded one, if a playtest set one. */
export function shotMove(shot: CarromShot): CarromShot & { table?: LoadedCarromShot["table"] } {
  if (!import.meta.env.DEV) return shot;
  const loaded = window.loadedCarromShots?.shift();
  if (loaded === undefined) return shot;
  return { at: loaded.at, dx: loaded.dx, dy: loaded.dy, power: loaded.power ?? shot.power, ...(loaded.table && { table: loaded.table }) };
}
