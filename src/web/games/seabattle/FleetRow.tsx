import { clsx } from "clsx";
import { SEABATTLE_CONFIG } from "../../../shared/games/seabattle/config";
import { playerStyle } from "../../utils/playerStyle";
import { ShipShape } from "./ShipShape";
import { STAGE } from "./stageGeometry";
import { WRECK_STYLE } from "./wreckStyle";

interface FleetRowProps {
  label: string;
  /** Which of its ships have gone down (by their place in the fleet). */
  sunk: ReadonlySet<number>;
  /** Whose fleet (their color). */
  ownerId: number;
}

/** A player's fleet in a row, each ship drawn small: in their color while afloat, burnt once sunk (it slams down as it goes). */
export function FleetRow({ label, sunk, ownerId }: FleetRowProps) {
  return (
    <ul
      className="flex items-center justify-center"
      style={{ height: `calc(var(--sea-l) * ${STAGE.stripShip})`, gap: `calc(var(--sea-l) * ${STAGE.stripSpace})`, ...playerStyle(ownerId) }}
      aria-label={label}
    >
      {SEABATTLE_CONFIG.fleet.map((length, index) => (
        <li
          key={index}
          className="h-full flex-none"
          style={{ width: `calc(var(--sea-l) * ${length * STAGE.stripShip})`, ...(sunk.has(index) ? WRECK_STYLE : {}) }}
          aria-label={`Ship of ${length}${sunk.has(index) ? ", sunk" : ""}`}
        >
          <ShipShape key={String(sunk.has(index))} index={index} vertical={false} className={clsx("size-full", sunk.has(index) && "animate-wreck-in")} />
        </li>
      ))}
    </ul>
  );
}
