import { shipLength } from "../../../shared/games/seabattle/fleet";
import { playerStyle } from "../../utils/playerStyle";
import { ShipShape } from "./ShipShape";

interface DraggedShipProps {
  index: number;
  vertical: boolean;
  /** Which of its cells the finger holds. */
  grab: number;
  /** The finger on screen. */
  x: number;
  y: number;
  /** One board cell's size on screen: it's carried at the board's size. */
  cellPx: number;
  colorId: number;
}

/** A ship carried off the board (out of the dock, or back to it): drawn under the finger, by the cell it was picked up by. */
export function DraggedShip({ index, vertical, grab, x, y, cellPx, colorId }: DraggedShipProps) {
  const long = shipLength(index) * cellPx;
  const back = (grab + 0.5) * cellPx;
  const box = vertical
    ? { left: x - cellPx / 2, top: y - back, width: cellPx, height: long }
    : { left: x - back, top: y - cellPx / 2, width: long, height: cellPx };
  return (
    <div className="pointer-events-none fixed z-raised scale-(--transform-win-scale)" style={{ ...box, ...playerStyle(colorId) }}>
      <ShipShape index={index} vertical={vertical} className="size-full" />
    </div>
  );
}
