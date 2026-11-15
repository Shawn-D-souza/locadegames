import { clsx } from "clsx";
import { sidesOf } from "../../../shared/games/dotsboxes/board";
import { playerStyle } from "../../utils/playerStyle";
import { boardUnit, boxStyle, dotStyle, lineStyle } from "./geometry";

const SIZE = 3;
/** Won boxes forming an L, for Locade, each in a different player's color (owner direction), with a few more lines drawn so it's still a game in play. */
const L_BOXES = [0, 3, 6, 7, 8];
const WON: readonly (number | null)[] = Array.from({ length: SIZE * SIZE }, (_, box) => (L_BOXES.includes(box) ? L_BOXES.indexOf(box) : null));
const DRAWN = new Set([...L_BOXES.flatMap((box) => sidesOf(SIZE, box)), 1, 4, 15]);
const LINES = Array.from({ length: 2 * SIZE * (SIZE + 1) }, (_, line) => line);
const CORNERS = Array.from({ length: (SIZE + 1) * (SIZE + 1) }, (_, i) => i);

/** A small copy of the board: ink dots and lines on white, an L of won boxes, each in a different player's color. */
export function DotsBoxesArt() {
  return (
    <div className="@container relative size-full rounded-art-cell border-thin border-ink bg-white" style={boardUnit(SIZE)} aria-hidden="true">
      {WON.map((owner, box) =>
        owner === null ? null : <span key={box} className="absolute bg-player" style={{ ...boxStyle(SIZE, box), ...playerStyle(owner) }} />,
      )}
      {LINES.map((line) => (
        <span key={line} className={clsx("absolute rounded-pill", DRAWN.has(line) ? "bg-ink" : "bg-tile-edge")} style={lineStyle(SIZE, line, DRAWN.has(line))} />
      ))}
      {CORNERS.map((corner) => (
        <span key={`d${corner}`} className="absolute rounded-pill bg-ink" style={dotStyle(Math.floor(corner / (SIZE + 1)), corner % (SIZE + 1))} />
      ))}
    </div>
  );
}
