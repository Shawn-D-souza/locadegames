import { clsx } from "clsx";
import type { PointerEvent } from "react";
import type { PlayerId } from "../../../../shared/rooms/types";
import { playerStyle } from "../../../utils/playerStyle";
import { DriveArrow } from "./DriveArrow";

interface DriveButtonProps {
  direction: "left" | "right";
  /** Held right now (by a finger or a key): it sits pressed in, in your color. */
  pressed: boolean;
  colorId: PlayerId;
  /** A finger went down on its half of the screen or came off it. */
  onPress(pointerId: number, down: boolean): void;
}

const ZONE_CLASSES = "absolute inset-y-0 flex w-1/2 cursor-pointer touch-none items-end p-4 select-none";
const DISC_CLASSES =
  "flex size-drive-button items-center justify-center rounded-pill border-thin border-ink transition-[translate,box-shadow,background-color] duration-fast ease-spring";

/**
 * One of the two drive buttons: a small round button in its bottom corner, held to drive (and to turn the car
 * in the air). The whole half of the screen around it takes the touch, so a thumb never has to aim and the
 * button can stay small. Keys work without it (arrows or A / D).
 */
export function DriveButton({ direction, pressed, colorId, onPress }: DriveButtonProps) {
  const release = (event: PointerEvent) => onPress(event.pointerId, false);
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={direction === "left" ? "Drive left" : "Drive right"}
      aria-pressed={pressed}
      style={playerStyle(colorId)}
      className={clsx(ZONE_CLASSES, direction === "left" ? "left-0 justify-start" : "right-0 justify-end")}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(event.pointerId, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className={clsx(DISC_CLASSES, pressed ? "translate-y-lip-medium bg-player text-player-text shadow-pressed" : "bg-white text-ink shadow-lip-medium")}>
        <DriveArrow direction={direction} className="size-drive-icon" />
      </span>
    </button>
  );
}
