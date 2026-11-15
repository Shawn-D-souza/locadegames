import { useRef, useState } from "react";
import type { Point } from "../../../shared/games/carrom/board";
import type { CarromCoin, CarromSide } from "../../../shared/games/carrom/types";
import { playHaptic } from "../../services/hapticPlayer";
import { CARROM_LOOK } from "./look";
import { holdIntent, moved, onStriker, slideTo, slingOf, type Aim, type Sling } from "./strikerGrip";

/** What a finger does on and around the board, in board units. */
export interface BoardControl {
  down(point: Point): void;
  move(point: Point): void;
  up(point: Point): void;
  cancel(): void;
}

interface StrikerControlOptions {
  coins: readonly CarromCoin[];
  side: CarromSide;
  striker: Point;
  /** The striker slid along the baseline to here (units from its middle). */
  onPlace(at: number): void;
  /** Let go after pulling back: the shot goes along `aim`, this hard (0 … 1), let go at `at` on this phone's clock (`Date.now`). */
  onShoot(aim: Aim, power: number, at: number): void;
}

/**
 * What the finger is doing: touched down away from the striker (a long press there takes hold), holding the striker (not
 * yet moved enough to tell), sliding it along the baseline, or pulling it back.
 */
type Grip = { kind: "waiting"; from: Point } | { kind: "holding"; from: Point; onStriker: boolean } | { kind: "sliding" } | { kind: "pulling"; from: Point } | null;

/**
 * Your shot, like flicking a real striker (owner direction): take hold of the striker and slide it along your baseline,
 * or pull back from it in any direction and let go: it shoots the opposite way to your pull (forward only), as hard as
 * the pull is long. No arrow, no aim line (owner direction); only while you pull back, `pull` says how (the board draws
 * a band behind the striker from it). Where the striker has no room behind it, hold a finger still anywhere for a
 * moment (Android ticks) and pull back from there. Back where you took hold and let go, it takes no shot; sliding never
 * shoots.
 */
export function useStrikerControl({ coins, side, striker, onPlace, onShoot }: StrikerControlOptions): { control: BoardControl; pull: Sling | null } {
  const grip = useRef<Grip>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pull, setPull] = useState<Sling | null>(null);
  const stopTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const end = () => {
    stopTimer();
    grip.current = null;
    setPull(null);
  };
  const slide = (point: Point) => {
    const at = slideTo(coins, side, point);
    if (at !== null) onPlace(at);
  };
  const control: BoardControl = {
    down(point) {
      if (onStriker(striker, point)) {
        grip.current = { kind: "holding", from: point, onStriker: true };
        return;
      }
      grip.current = { kind: "waiting", from: point };
      // Held still for a moment: take hold of the striker from here.
      timer.current = setTimeout(() => {
        timer.current = null;
        const now = grip.current;
        if (now?.kind !== "waiting") return;
        grip.current = { kind: "holding", from: now.from, onStriker: false };
        playHaptic("carromStrikerHeld");
      }, CARROM_LOOK.longPressMs);
    },
    move(point) {
      const held = grip.current;
      if (held === null) return;
      if (held.kind === "waiting") {
        // Moved before the long press: not a hold.
        if (moved(held.from, point) >= CARROM_LOOK.gripDecide) end();
        return;
      }
      if (held.kind === "sliding") return slide(point);
      if (held.kind === "pulling") return setPull(slingOf(side, held.from, point));
      if (moved(held.from, point) < CARROM_LOOK.gripDecide) return;
      if (holdIntent(side, held.from, point, held.onStriker) === "slide") {
        grip.current = { kind: "sliding" };
        return slide(point);
      }
      grip.current = { kind: "pulling", from: held.from };
      setPull(slingOf(side, held.from, point));
    },
    up(point) {
      const held = grip.current;
      end();
      if (held?.kind !== "pulling") return;
      const sling = slingOf(side, held.from, point);
      if (sling && sling.power >= CARROM_LOOK.powerDeadZone) onShoot(sling.aim, sling.power, Date.now());
    },
    cancel: end,
  };
  return { control, pull };
}
