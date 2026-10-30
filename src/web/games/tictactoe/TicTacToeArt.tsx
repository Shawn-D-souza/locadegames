import { TICTACTOE_CONFIG } from "../../../shared/games/tictactoe/config";
import type { Cell } from "../../../shared/games/tictactoe/types";
import { Mark } from "../../components/Mark";
import { playerStyle } from "../../utils/playerStyle";

/** A mid-game board for the game tile: X about to win on the diagonal. */
const PREVIEW: readonly Cell[] = [0, null, 1, null, 0, null, 1, null, null];

/** A small copy of the real board: pale wells with ink outlines, marks in the first two player colors. */
export function TicTacToeArt() {
  return (
    <div className="grid size-full gap-1" style={{ gridTemplateColumns: `repeat(${TICTACTOE_CONFIG.boardSize}, 1fr)` }} aria-hidden="true">
      {PREVIEW.map((value, index) => (
        <span
          key={index}
          className="flex items-center justify-center rounded-art-cell border-thin border-ink bg-background"
          style={value !== null ? playerStyle(value) : undefined}
        >
          {value !== null && <Mark seat={value} className="size-4/5" />}
        </span>
      ))}
    </div>
  );
}
