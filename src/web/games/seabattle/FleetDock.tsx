import { clsx } from "clsx";
import type { CSSProperties, PointerEvent } from "react";
import { shipLength, type FleetDraft } from "../../../shared/games/seabattle/fleet";
import { playerStyle } from "../../utils/playerStyle";
import { ShipShape } from "./ShipShape";

/**
 * How the dock lies the ships out: `wide` (under the board in portrait, its whole width) in two rows, the 5 and the 4,
 * then the 3s and the 2 (nine cells across at most); `narrow` (the column beside the board in landscape) in three, the 5,
 * the 4 and the 2, the 3s (six across at most). A cell is as big as fits, at most `space-8`, the gaps roomy.
 */
const SHAPES = {
  wide: { rows: [[0, 1], [2, 3, 4]], cell: "w-[calc(var(--cells)*min(var(--space-8),(100%-2*var(--space-6))/9))]" },
  narrow: { rows: [[0], [1, 4], [2, 3]], cell: "w-[calc(var(--cells)*min(var(--space-8),(100%-var(--space-6))/6))]" },
} as const;

interface FleetDockProps {
  shape: keyof typeof SHAPES;
  fleet: FleetDraft;
  myId: number;
  /** The ship being dragged out of the dock (shown faded in its place). */
  lifted: number | null;
  /** A press on a ship: `grab` is which of its cells the finger is on. */
  onGrab(index: number, grab: number, event: PointerEvent<HTMLButtonElement>): void;
  className?: string;
}

/** The ships not on the board yet, lying across, to drag on. Each keeps its own place, so the others never move when one leaves. */
export function FleetDock({ shape, fleet, myId, lifted, onGrab, className }: FleetDockProps) {
  const { rows, cell } = SHAPES[shape];
  return (
    <div className={clsx("flex w-full flex-col items-center gap-4 sideways:gap-2", className)} style={playerStyle(myId)} aria-label="Ships to place" role="group">
      {rows.map((row) => (
        <div key={row[0]} className="flex w-full justify-center gap-6">
          {row.map((index) => {
            const length = shipLength(index);
            const docked = fleet[index] === null;
            return (
              <button
                key={index}
                type="button"
                aria-label={`Ship of ${length}: drag onto the board`}
                disabled={!docked}
                className={clsx("aspect-(--ratio) flex-none touch-none", cell, docked ? "cursor-grab active:cursor-grabbing" : "invisible")}
                style={{ "--ratio": `${length} / 1`, "--cells": length } as CSSProperties}
                onPointerDown={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const grab = Math.min(length - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * length)));
                  onGrab(index, grab, event);
                }}
              >
                <ShipShape
                  index={index}
                  vertical={false}
                  className={clsx("size-full transition-opacity duration-fast ease-out", lifted === index && "opacity-target-waiting")}
                />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
