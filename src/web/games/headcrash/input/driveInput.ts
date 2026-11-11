import { BUTTON_LEFT, BUTTON_RIGHT } from "../../../../shared/games/headcrash/config";

const KEY_BUTTONS: Record<string, number> = {
  ArrowLeft: BUTTON_LEFT,
  KeyA: BUTTON_LEFT,
  ArrowRight: BUTTON_RIGHT,
  KeyD: BUTTON_RIGHT,
};

/**
 * The two buttons, from wherever they are pressed: the on-screen ones (any number of fingers each) and the
 * keyboard (arrows or A / D). Reports the buttons held, as bits, whenever they change.
 */
export class DriveInput {
  private readonly keys = new Set<string>();
  /** Fingers down per on-screen button. */
  private readonly touches = new Map<number, Set<number>>([
    [BUTTON_LEFT, new Set()],
    [BUTTON_RIGHT, new Set()],
  ]);
  private held = 0;

  constructor(private readonly onChange: (buttons: number) => void) {
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.releaseAll);
    document.addEventListener("visibilitychange", this.releaseAll);
  }

  dispose() {
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.releaseAll);
    document.removeEventListener("visibilitychange", this.releaseAll);
  }

  /** A finger went down on (or came off) an on-screen button. */
  press(button: number, pointerId: number, down: boolean) {
    const fingers = this.touches.get(button);
    if (!fingers) return;
    if (down) fingers.add(pointerId);
    else fingers.delete(pointerId);
    this.update();
  }

  private update() {
    let buttons = 0;
    for (const code of this.keys) buttons |= KEY_BUTTONS[code] ?? 0;
    for (const [button, fingers] of this.touches) if (fingers.size > 0) buttons |= button;
    if (buttons === this.held) return;
    this.held = buttons;
    this.onChange(buttons);
  }

  private readonly keyDown = (event: KeyboardEvent) => {
    if (!(event.code in KEY_BUTTONS) || event.repeat) return;
    event.preventDefault();
    this.keys.add(event.code);
    this.update();
  };

  private readonly keyUp = (event: KeyboardEvent) => {
    if (!this.keys.delete(event.code)) return;
    this.update();
  };

  /** The window lost focus: a key or finger let go out of sight would otherwise stay held. */
  private readonly releaseAll = () => {
    this.keys.clear();
    for (const fingers of this.touches.values()) fingers.clear();
    this.update();
  };
}
