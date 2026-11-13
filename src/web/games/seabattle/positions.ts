import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { colOf, rowOf } from "../../../shared/games/seabattle/fleet";

const COLUMNS = "ABCDEFGH".slice(0, SEABATTLE_CONFIG.boardSize);

/** A cell as players say it: column letter and row number, `B4` (also the cell buttons' names, for screen readers and playtests). */
export function cellName(cell: number): string {
  return `${COLUMNS[colOf(cell)]}${rowOf(cell) + 1}`;
}
