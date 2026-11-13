import { clsx } from "clsx";
import type { PointerEvent } from "react";
import { shipLength } from "../../../shared/games/seabattle/fleet";
import type { Ship } from "../../../shared/games/seabattle/types";
import { playerStyle } from "../../utils/playerStyle";
import { shipBox } from "./seaGeometry";
import { WRECK_STYLE } from "./wreckStyle";
import { ShipShape } from "./ShipShape";

/**
 * afloat: a ship in its player's color · wreck: a sunk ship, anyone's, burnt (it slams down as it goes) · revealed:
 * one never found, shown at the end (paler) · lifted: being
 * dragged where it fits (a little bigger) · blocked: being dragged where it doesn't fit (bigger and faded) · clashing:
 * turned onto another ship while placing (faded, so both show).
 */
export type HullLook = "afloat" | "wreck" | "revealed" | "lifted" | "blocked" | "clashing";

const LOOK_CLASSES: Record<HullLook, string> = {
  afloat: "",
  wreck: "animate-wreck-in",
  revealed: "opacity-target-waiting",
  lifted: "scale-(--transform-win-scale)",
  blocked: "scale-(--transform-win-scale) opacity-disabled",
  clashing: "opacity-disabled",
};

interface ShipHullProps {
  ship: Ship;
  /** Its place in the fleet (which ship, its length). */
  index: number;
  /** Whose ship (their color). */
  colorId: number;
  look: HullLook;
  /** Placing: the ship takes a press (drag to move, tap to turn). It looks like any other ship, with no button lip (owner decision). */
  editable?: { label: string; onPointerDown(event: PointerEvent<HTMLButtonElement>): void };
}

/** A ship over the cells it lies on: its drawing, turned with it. */
export function ShipHull({ ship, index, colorId, look, editable }: ShipHullProps) {
  const drawing = clsx("size-full transition-[scale,opacity] duration-fast ease-spring", LOOK_CLASSES[look]);
  return (
    <span className="absolute" style={{ ...shipBox(ship, shipLength(index)), ...(look === "wreck" ? WRECK_STYLE : playerStyle(colorId)) }}>
      {editable ? (
        <button
          type="button"
          aria-label={editable.label}
          className="pointer-events-auto size-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={editable.onPointerDown}
        >
          <ShipShape index={index} vertical={ship.vertical} className={drawing} />
        </button>
      ) : (
        <ShipShape index={index} vertical={ship.vertical} className={drawing} />
      )}
    </span>
  );
}
