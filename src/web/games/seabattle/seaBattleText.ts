import { shipCells, shipLength } from "../../../shared/games/seabattle/fleet";
import { isGameOver } from "../../../shared/games/seabattle/rules";
import { MARK, type SeaBattleState, type Wreck } from "../../../shared/games/seabattle/types";
import type { Seat } from "../../../shared/games/types";

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Placing, with a ship turned onto another: it has to move before READY. */
export const SHIPS_OVERLAP = "SHIPS CAN'T OVERLAP!";

/**
 * The one line above the board: what's happening, in the platform's shouty voice. `viewer` is your seat (null
 * watching); `names` each seat's player. Empty once the match is over (the result tag says it).
 */
export function seaBattleStatus(game: SeaBattleState, viewer: Seat | null, names: readonly [string, string]): string {
  if (isGameOver(game)) return "";
  if (game.phase === "place") {
    if (viewer === null) return "PLACING SHIPS";
    if (!game.ready[viewer]) return "PLACE YOUR SHIPS!";
    return `WAITING FOR ${names[other(viewer)]}`;
  }
  const shooter = game.turn;
  const last = game.lastShot;
  // The shooter just hit (and goes again), or sank a ship.
  const target = game.marks[other(shooter)];
  const hit = last !== null && last.seat === shooter && target[last.cell] === MARK.hit;
  const sank = hit && justSank(game, shooter);
  if (viewer === shooter) {
    if (sank) return "SUNK! FIRE AGAIN!";
    if (hit) return "HIT! FIRE AGAIN!";
    // Your first shot: how firing works.
    if (target.every((mark) => mark === MARK.none)) return "HOLD TO AIM, LET GO TO FIRE!";
    return "YOUR TURN: FIRE!";
  }
  // Their shots, on your own fleet (or, watching, whoever they fire at).
  const at = viewer === null ? "" : " AT YOU";
  if (sank) return viewer === null ? `${names[shooter]} SANK A SHIP!` : `${names[shooter]} SANK YOUR SHIP!`;
  if (hit) return `${names[shooter]} HIT! FIRING AGAIN`;
  return `${names[shooter]} IS FIRING${at}`;
}

/** Whether the shooter's last shot finished a ship (it lies on the latest wreck). */
function justSank(game: SeaBattleState, shooter: Seat): boolean {
  const wreck = game.wrecks[other(shooter)].at(-1);
  if (!wreck || !game.lastShot) return false;
  return wreckCells(wreck).includes(game.lastShot.cell);
}

const wreckCells = (wreck: Wreck) => shipCells(wreck, shipLength(wreck.index)) ?? [];
