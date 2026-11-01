import { angleOf } from "../../../../shared/games/territory/movement";
import { TERRITORY_CLIENT_CONFIG } from "../config";

const CONTROLS = TERRITORY_CLIENT_CONFIG.controls;

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

/**
 * Steering in any direction. Touch or mouse: an invisible floating joystick wherever the finger lands
 * (dragging past its reach pulls it along, so turning back is instant; nothing is drawn, owner decision). Keyboard: arrows or WASD, diagonals included.
 * Lifting the finger keeps the current direction.
 */
export class SteeringInput {
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private readonly keys = new Set<string>();

  constructor(
    private readonly element: HTMLElement,
    private readonly onTarget: (angle: number) => void,
  ) {
    element.addEventListener("pointerdown", this.down);
    element.addEventListener("pointermove", this.move);
    element.addEventListener("pointerup", this.up);
    element.addEventListener("pointercancel", this.up);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
  }

  dispose() {
    this.element.removeEventListener("pointerdown", this.down);
    this.element.removeEventListener("pointermove", this.move);
    this.element.removeEventListener("pointerup", this.up);
    this.element.removeEventListener("pointercancel", this.up);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
  }

  private local(e: PointerEvent) {
    const rect = this.element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private readonly down = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.element.setPointerCapture(e.pointerId);
    this.origin = this.local(e);
  };

  private readonly move = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const p = this.local(e);
    let dx = p.x - this.origin.x;
    let dy = p.y - this.origin.y;
    const length = Math.hypot(dx, dy);
    if (length > CONTROLS.stickRadiusPx) {
      // Past the reach: the stick's center follows the finger.
      const pull = (length - CONTROLS.stickRadiusPx) / length;
      this.origin = { x: this.origin.x + dx * pull, y: this.origin.y + dy * pull };
      dx = p.x - this.origin.x;
      dy = p.y - this.origin.y;
    }
    if (length >= CONTROLS.deadZonePx) this.onTarget(angleOf(dx, dy));
  };

  private readonly up = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
  };

  private readonly keyDown = (e: KeyboardEvent) => {
    if (!(e.code in KEY_DIRECTIONS)) return;
    e.preventDefault();
    this.keys.add(e.code);
    this.steerByKeys();
  };

  private readonly keyUp = (e: KeyboardEvent) => {
    if (!this.keys.delete(e.code)) return;
    this.steerByKeys();
  };

  private steerByKeys() {
    let dx = 0;
    let dy = 0;
    for (const code of this.keys) {
      const [x, y] = KEY_DIRECTIONS[code]!;
      dx += x;
      dy += y;
    }
    if (dx !== 0 || dy !== 0) this.onTarget(angleOf(dx, dy));
  }
}
