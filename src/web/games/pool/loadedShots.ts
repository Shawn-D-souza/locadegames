import type { PoolShot } from "../../../shared/games/pool/types";

/**
 * Development only: a playtest can line up its next shots (`window.loadedShots = [{ table, dx, dy }]`): the balls put
 * where it wants them (`[x, y, on]` per ball, in the game's order) and the cue pointed at what it placed, so it
 * reaches its moments (a pot, a foul, the black) at once. The power still comes from the bar. The dev server
 * (`npm run dev:server`) accepts the table; production builds never send it and the production server ignores it.
 */
export interface LoadedShot {
  table?: [number, number, boolean][];
  dx: number;
  dy: number;
  power?: number;
}

declare global {
  interface Window {
    loadedShots?: LoadedShot[];
  }
}

/** What letting go of the power bar sends: the shot as aimed, or in development the next loaded one, if a playtest set one. */
export function shotMove(shot: PoolShot): PoolShot & { table?: LoadedShot["table"] } {
  if (!import.meta.env.DEV) return shot;
  const loaded = window.loadedShots?.shift();
  return loaded === undefined ? shot : { dx: loaded.dx, dy: loaded.dy, power: loaded.power ?? shot.power, ...(loaded.table && { table: loaded.table }) };
}
