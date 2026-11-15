import { useRef, useState, type PointerEvent } from "react";
import { playHaptic } from "../../services/hapticPlayer";

interface DropAimOptions {
  columns: number;
  /** Your turn: you may aim and drop. */
  enabled: boolean;
  onDrop(column: number): void;
}

/**
 * Aiming a disc with one finger (owner decision: a tap and a drag are the same gesture). The finger goes down on the
 * board: your disc shows above the column under it; slide sideways and it follows, a tick per column; let go and it
 * drops there. A tap is a press and a let-go in the same column. Slide off the board before letting go and nothing
 * drops. With a mouse the disc also follows the pointer before the click. Columns are read across the board's area
 * (the aiming row and the holes under it), whose handlers these are.
 */
export function useDropAim({ columns, enabled, onDrop }: DropAimOptions) {
  const [aim, setAim] = useState<number | null>(null);
  /** The finger (or button) held down, if one is. */
  const pressed = useRef<number | null>(null);

  const columnAt = (event: PointerEvent<HTMLElement>): number | null => {
    const area = event.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if (x < area.left || x >= area.right || y < area.top || y >= area.bottom) return null;
    return Math.min(columns - 1, Math.floor(((x - area.left) / area.width) * columns));
  };

  const moveTo = (column: number | null) => {
    if (column === aim) return;
    if (pressed.current !== null && column !== null) playHaptic("fourInARowAimMoved");
    setAim(column);
  };

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      // Keeps the finger's moves coming here once it slides off the board, so letting go there is seen (and drops nothing).
      event.currentTarget.setPointerCapture(event.pointerId);
      pressed.current = event.pointerId;
      setAim(columnAt(event));
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!enabled) return;
      const held = pressed.current;
      if (held === null ? event.pointerType !== "mouse" : event.pointerId !== held) return;
      moveTo(columnAt(event));
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (event.pointerId !== pressed.current) return;
      pressed.current = null;
      const column = columnAt(event);
      // A mouse still hovers where it clicked; a finger has left the glass.
      setAim(event.pointerType === "mouse" ? column : null);
      if (enabled && column !== null) onDrop(column);
    },
    onPointerCancel() {
      pressed.current = null;
      setAim(null);
    },
    onPointerLeave() {
      if (pressed.current === null) setAim(null);
    },
  };

  return { aim: enabled ? aim : null, handlers };
}
