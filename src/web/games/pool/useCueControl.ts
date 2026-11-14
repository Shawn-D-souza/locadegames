import { useRef, useState } from "react";
import { playHaptic } from "../../services/hapticPlayer";
import { moved, onCue, pullingBack, pullOf, turnBy, type Aim, type TablePoint } from "./cueGrip";
import { POOL_LOOK } from "./look";

/** What a finger does on and around the table, in table units. */
export interface TableControl {
  down(point: TablePoint): void;
  move(point: TablePoint): void;
  up(point: TablePoint): void;
  cancel(): void;
}

interface CueControlOptions {
  cueBall: TablePoint;
  aim: Aim;
  onAim(aim: Aim): void;
  /** Let go with the cue drawn back: the shot, this hard (0 … 1). */
  onShoot(power: number): void;
}

/**
 * What the finger is doing: turning the cue (`from`: where it touched down, for the long press while it's still near),
 * holding the cue (on the stick, the cue ball, or after a long press; not yet moved enough to tell), or pulling it back.
 */
type Grip =
  | { kind: "turning"; from: TablePoint; last: TablePoint; still: boolean }
  | { kind: "holding" | "pulling"; from: TablePoint; aim: Aim }
  | null;

/**
 * Your shot with nothing but the cue (owner direction: no button). Touch anywhere on or around the table and sweep round
 * the cue ball: the cue turns with you (on the stick it follows your finger; it never jumps, so a ball in a corner can be
 * aimed out of it). To shoot, take hold of the cue: touch the stick or the cue ball, or hold a finger still anywhere for
 * a moment (owner decision: so a ball in a corner can be pulled back from where there's room; the cue twitches and
 * Android ticks). Then pull straight back and let go; anything else (sideways, forward) turns it. Back where
 * you took hold and let go, it takes no shot; turning never shoots.
 */
export function useCueControl({ cueBall, aim, onAim, onShoot }: CueControlOptions): { control: TableControl; pull: number | null; twitch: number } {
  const grip = useRef<Grip>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The aim as turned so far, ahead of the next render (a finger moves more than once between frames).
  const aimNow = useRef(aim);
  const [pull, setPull] = useState<number | null>(null);
  // A long press took hold: the cue twitches back a hair and straight in again (table units, 0 the rest of the time).
  const [twitch, setTwitch] = useState(0);
  const twitchCue = () => {
    const start = performance.now();
    const frame = () => {
      const t = (performance.now() - start) / POOL_LOOK.holdTwitchMs;
      setTwitch(t < 1 ? POOL_LOOK.holdTwitch * Math.sin(Math.PI * t) : 0);
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const stopTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const end = () => {
    stopTimer();
    grip.current = null;
    setPull(null);
  };
  const hold = (from: TablePoint) => {
    grip.current = { kind: "holding", from, aim: aimNow.current };
  };
  const turn = (from: TablePoint, last: TablePoint, point: TablePoint, still: boolean) => {
    const next = turnBy(aimNow.current, cueBall, last, point);
    if (next) {
      aimNow.current = next;
      onAim(next);
    }
    grip.current = { kind: "turning", from, last: point, still };
  };
  const control: TableControl = {
    down(point) {
      aimNow.current = aim;
      if (onCue(cueBall, aim, point)) return hold(point);
      grip.current = { kind: "turning", from: point, last: point, still: true };
      // Held still for a moment: take hold of the cue from here.
      timer.current = setTimeout(() => {
        timer.current = null;
        const now = grip.current;
        if (now?.kind !== "turning" || !now.still) return;
        hold(now.last);
        playHaptic("poolCueHeld");
        twitchCue();
      }, POOL_LOOK.longPressMs);
    },
    move(point) {
      const held = grip.current;
      if (held === null) return;
      if (held.kind === "turning") {
        const still = held.still && moved(held.from, point) < POOL_LOOK.gripDecide;
        if (!still) stopTimer();
        return turn(held.from, held.last, point, still);
      }
      if (held.kind === "holding") {
        if (moved(held.from, point) < POOL_LOOK.gripDecide) return;
        if (!pullingBack(held.aim, held.from, point)) return turn(held.from, held.from, point, false);
        grip.current = { ...held, kind: "pulling" };
      }
      setPull(pullOf(held.aim, held.from, point));
    },
    up(point) {
      const held = grip.current;
      end();
      if (held?.kind !== "pulling") return;
      const power = pullOf(held.aim, held.from, point);
      if (power >= POOL_LOOK.powerDeadZone) onShoot(power);
    },
    cancel: end,
  };
  return { control, pull, twitch };
}
