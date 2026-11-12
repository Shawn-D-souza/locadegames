import { useEffect, useRef, useState } from "react";
import { BUTTON_LEFT, BUTTON_RIGHT, HEADCRASH_CONFIG } from "../../../shared/games/headcrash/config";
import { layoutFor } from "../../../shared/games/headcrash/layout";
import { MAPS } from "../../../shared/games/headcrash/maps";
import { countdownTicksFor, createHeadCrash, layoutOf, motionOf, scorerOf, stepHeadCrash, waterOf } from "../../../shared/games/headcrash/simulation";
import { PHASE, type HeadCrashState } from "../../../shared/games/headcrash/types";
import type { FrameView, HitView, MomentView } from "../../games/headcrash/engine/frame";
import { emptyReport, StepMoments } from "../../games/headcrash/engine/stepMoments";
import { HeadCrashAudio } from "../../games/headcrash/headCrashAudio";
import { HeadCrashRenderer } from "../../games/headcrash/render/headCrashRenderer";
import { prepareGameSounds } from "../../services/soundPlayer";
import { loadTuning } from "./tuning";
import { TuningPanel } from "./TuningPanel";

const { tickMs, water } = HEADCRASH_CONFIG;
/** Red on A / D, blue on the arrows. */
const KEYS: Record<string, [seat: 0 | 1, button: number]> = {
  KeyA: [0, BUTTON_LEFT],
  KeyD: [0, BUTTON_RIGHT],
  ArrowLeft: [1, BUTTON_LEFT],
  ArrowRight: [1, BUTTON_RIGHT],
};
const BUTTON_CLASSES = "cursor-pointer rounded-pill border-thin border-ink bg-white px-3 py-1 text-caption";

/** The map picker's choice for every map in the match's shuffled order (the game's own way). */
const SHUFFLED = "";
const MAP_KEY = "headcrash-map";

/** The map picked last time on this browser, if it still exists. */
function savedMap(): string {
  try {
    const name = localStorage.getItem(MAP_KEY) ?? SHUFFLED;
    return MAPS.some((m) => m.name === name) ? name : SHUFFLED;
  } catch {
    return SHUFFLED;
  }
}

/** The first round from `round` on that this match plays on map `name` (every map comes once in any run of rounds as long as the list). */
function nextRoundOn(seed: number, round: number, name: string): number {
  for (let r = round; r < round + MAPS.length; r++) if (layoutFor(seed, r).name === name) return r;
  return round;
}

/**
 * Dev-only page (`?preview=headcrash`): the game on one keyboard, with no server and no netcode (red drives
 * with A / D, blue with the arrows; on a phone, holding the left or right half of the screen drives red), to judge
 * the driving, the maps, the look and the sounds (heard as red's driver). The tuner on the left changes the driving's numbers as it plays. The map picker keeps every round on one map (or every map, shuffled, as in a real match). RESTART ROUND plays the same
 * map again; SKIP ROUND moves to the next map (every map comes once, in the match's order; the bar names it); NEW
 * MATCH starts over in another order.
 */
export function HeadCrashPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(1);
  const [info, setInfo] = useState("");
  // What was tuned last time, in place before the first step.
  useState(loadTuning);
  const jump = useRef<"skip" | "restart" | null>(null);
  const [map, setMap] = useState(savedMap);
  const pinned = useRef(map);

  const pickMap = (name: string) => {
    setMap(name);
    pinned.current = name;
    jump.current = "restart";
    try {
      localStorage.setItem(MAP_KEY, name);
    } catch {
      // No storage: the pick lasts until the page reloads.
    }
  };

  useEffect(() => prepareGameSounds("headcrash"), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new HeadCrashRenderer(canvas, { players: [0, 1], mySeat: null });
    // Heard as red's driver: red's motor, landings and pads, and a hit as red's point or red's head.
    const audio = new HeadCrashAudio(0);
    const stepMoments = new StepMoments();
    let moments: MomentView[] = [];
    /** A round on another map than the picked one moves on to the next round on it (a shorter countdown, the score kept). */
    const keepToMap = (s: HeadCrashState): HeadCrashState => {
      const name = pinned.current;
      if (name === SHUFFLED || layoutOf(s).name === name) return s;
      const next = createHeadCrash(seed, nextRoundOn(seed, s.round, name), s.score);
      next.phaseTicks = countdownTicksFor(false);
      return next;
    };
    let state = keepToMap(createHeadCrash(seed));
    const held: [number, number] = [0, 0];
    const report = emptyReport();
    let hit: HitView | null = null;
    let roundShownAt = performance.now();
    let shownRound = state.round;
    let roundsPlayed = 1;

    const key = (down: boolean) => (event: KeyboardEvent) => {
      const bound = KEYS[event.code];
      if (!bound) return;
      event.preventDefault();
      held[bound[0]] = down ? held[bound[0]] | bound[1] : held[bound[0]] & ~bound[1];
    };
    const keyDown = key(true);
    const keyUp = key(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    // Touch: a finger on the left or right half of the screen holds red's button on that side.
    const touches = new Map<number, number>();
    const touchButtons = () => [...touches.values()].reduce((all, b) => all | b, 0);
    const pointerDown = (event: PointerEvent) => {
      touches.set(event.pointerId, event.offsetX < canvas.clientWidth / 2 ? BUTTON_LEFT : BUTTON_RIGHT);
      held[0] = touchButtons();
    };
    const pointerUp = (event: PointerEvent) => {
      if (!touches.delete(event.pointerId)) return;
      held[0] = touchButtons();
    };
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let owed = 0;
    const loop = (now: number) => {
      owed = Math.min(owed + now - last, 100);
      last = now;
      if (jump.current) {
        state = keepToMap(createHeadCrash(seed, state.round + (jump.current === "skip" ? 1 : 0), state.score));
        jump.current = null;
      }
      for (; owed >= tickMs; owed -= tickMs) {
        if (state.phase === PHASE.over) state = createHeadCrash(seed, state.round + 1);
        const before = state.phase;
        stepHeadCrash(state, held, report);
        if (before === PHASE.play) stepMoments.note(report, now, moments);
        else stepMoments.rest();
        if (before === PHASE.countdown && state.phase === PHASE.play) moments.push({ kind: "go", at: now });
        state = keepToMap(state);
      }
      if (state.hit && hit?.round !== state.round) {
        hit = { ...state.hit, round: state.round, shownAt: now };
        moments.push({ kind: "hit", hit: state.hit, scorer: scorerOf(state.hit.victims), at: now });
      }
      if (state.round !== shownRound) {
        shownRound = state.round;
        roundShownAt = now;
        roundsPlayed += 1;
        hit = null;
      }
      const car = (seat: 0 | 1) => ({ ...state.cars[seat], grounded: report.grounded[seat], buttons: state.buttons[seat] });
      const frame: FrameView = {
        layout: layoutFor(seed, state.round),
        round: state.round,
        phase: state.phase,
        cars: [car(0), car(1)],
        waterY: waterOf(state),
        motion: motionOf(state),
        waterRising: state.phase === PHASE.play && state.phaseTicks > water.startTicks,
        hit,
        roundShownAt,
      };
      renderer.draw(frame, now);
      audio.update(frame, moments, now);
      moments = [];
      const scorer = state.hit ? scorerOf(state.hit.victims) : null;
      setInfo(`${frame.layout.name} · round ${roundsPlayed} · ${state.score[0]} – ${state.score[1]}${state.hit ? (scorer === null ? " · both heads" : scorer === 0 ? " · red scores" : " · blue scores") : ""}`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      audio.stop();
      observer.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
    };
  }, [seed]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background select-none">
      <TuningPanel />
      <div className="relative min-w-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 size-full touch-none" />
        {/* Dev tool bar: compact, not part of the game's look. */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-2 p-4">
          <span className="rounded-pill bg-ink px-3 py-1 text-caption text-white">{info}</span>
          <select aria-label="Map" className={BUTTON_CLASSES} value={map} onChange={(event) => pickMap(event.target.value)}>
            <option value={SHUFFLED}>EVERY MAP (SHUFFLED)</option>
            {MAPS.map((m) => (
              <option key={m.name} value={m.name}>
                ONLY {m.name.toUpperCase()}
              </option>
            ))}
          </select>
          <button type="button" className={BUTTON_CLASSES} onClick={() => setSeed((n) => n + 1)}>
            NEW MATCH
          </button>
          <button type="button" className={BUTTON_CLASSES} onClick={() => (jump.current = "restart")}>
            RESTART ROUND
          </button>
          <button type="button" className={BUTTON_CLASSES} onClick={() => (jump.current = "skip")}>
            SKIP ROUND
          </button>
          <span className="text-caption">RED: A / D (or touch) · BLUE: ← / →</span>
        </div>
      </div>
    </div>
  );
}
