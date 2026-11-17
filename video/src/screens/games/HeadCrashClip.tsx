import { useLayoutEffect, useRef } from "react";
import { useVideoConfig } from "remotion";
import { BUTTON_LEFT, BUTTON_RIGHT, HEADCRASH_CONFIG } from "../../../../src/shared/games/headcrash/config";
import { layoutOf, motionOf, stepHeadCrash, waterOf, createHeadCrash } from "../../../../src/shared/games/headcrash/simulation";
import { PHASE, type HeadCrashState } from "../../../../src/shared/games/headcrash/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import type { FrameView } from "../../../../src/web/games/headcrash/engine/frame";
import { emptyReport } from "../../../../src/web/games/headcrash/engine/stepMoments";
import { HeadCrashRenderer } from "../../../../src/web/games/headcrash/render/headCrashRenderer";
import { DriveButton } from "../../../../src/web/games/headcrash/hud/DriveButton";
import { ScoreBar } from "../../../../src/web/games/headcrash/hud/ScoreBar";
import { IconButton } from "../../../../src/web/components/IconButton";
import { AppScreen } from "../../parts/AppScreen";
import { FRIENDS } from "../../cast";
import { cueSeconds } from "../../timing";
import { useClipSeconds } from "./script";

/**
 * Head Crash, Ana (red) against Ben (blue), on Ana's phone: she flips over off the trampoline and lands on Ben's head,
 * +1. The match and both drivers' buttons were found by playing rounds through the game's own simulation (each press
 * is [tick, seat, buttons held]); drawn on the game's real renderer and HUD, a step a frame (both are 60 a second).
 */
const SEED = 14;
const PRESSES: [number, number, number][] = [
  [0, 0, 0], [0, 1, 3], [15, 1, 2], [34, 0, 2], [43, 1, 1], [44, 0, 3], [56, 0, 0], [64, 0, 0], [75, 1, 1], [109, 0, 0],
  [117, 0, 3], [119, 1, 3], [152, 1, 3], [154, 0, 0], [182, 0, 3], [188, 1, 0], [213, 1, 2], [226, 0, 3], [238, 1, 1],
  [253, 1, 0], [255, 0, 2], [283, 1, 0], [287, 0, 2], [321, 0, 2], [325, 1, 2], [335, 1, 2],
];
/** Ana's head hit lands here in the video (seconds): mid-shot, a beat after the cut. */
const HIT_AT = cueSeconds("headCrash") + 1.25;
const PLAYERS: [{ id: PlayerId; name: string }, { id: PlayerId; name: string }] = [
  { id: 0 as PlayerId, name: FRIENDS[0] },
  { id: 1 as PlayerId, name: FRIENDS[1] },
];

interface Step {
  frame: Omit<FrameView, "hit" | "roundShownAt">;
  hit: HeadCrashState["hit"];
  score: [number, number];
  held: number;
}

/** Every step of the round, from its start until a second after the hit. */
function playRound(): { steps: Step[]; hitStep: number } {
  const state = createHeadCrash(SEED);
  const report = emptyReport();
  const held: [number, number] = [0, 0];
  const steps: Step[] = [];
  let hitStep = -1;
  for (let tick = 0; hitStep < 0 || tick <= hitStep + 90; tick++) {
    for (const [at, seat, buttons] of PRESSES) if (at === tick) held[seat] = buttons;
    if (state.phase !== PHASE.over) stepHeadCrash(state, held, report);
    if (state.hit && hitStep < 0) hitStep = tick;
    const car = (seat: 0 | 1) => ({ ...state.cars[seat], grounded: report.grounded[seat], buttons: state.buttons[seat] });
    steps.push({
      frame: {
        layout: layoutOf(state),
        round: state.round,
        phase: state.phase,
        cars: [car(0), car(1)],
        waterY: waterOf(state),
        motion: structuredClone(motionOf(state)),
        waterRising: state.phase === PHASE.play && state.phaseTicks > HEADCRASH_CONFIG.water.startTicks,
      },
      hit: state.hit ? { ...state.hit } : null,
      score: [...state.score] as [number, number],
      held: held[0],
    });
  }
  return { steps, hitStep };
}
const { steps: STEPS, hitStep: HIT_STEP } = playRound();
/** The round's step 0 in the video (seconds). */
const ROUND_START = HIT_AT - HIT_STEP / 60;

/** Head Crash on Ana's phone held sideways (the app's screen: the world, the score tab, the corner ✕, her two buttons). */
export function HeadCrashClip() {
  const t = useClipSeconds("headCrash");
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<HeadCrashRenderer | null>(null);
  const step = STEPS[Math.max(0, Math.min(STEPS.length - 1, Math.round((t - ROUND_START) * 60)))]!;
  const now = t * 1000;
  const frame: FrameView = {
    ...step.frame,
    hit: step.hit ? { ...step.hit, round: step.frame.round, shownAt: HIT_AT * 1000 } : null,
    roundShownAt: ROUND_START * 1000,
  };

  // Sized from the screen, not measured: Remotion lays a frame out off-page first, where everything measures 0.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!renderer.current) {
      renderer.current = new HeadCrashRenderer(canvas, { players: [0 as PlayerId, 1 as PlayerId], mySeat: 0 });
      renderer.current.resize(width, height, window.devicePixelRatio || 1);
    }
    renderer.current.draw(frame, now);
  });

  return (
    <AppScreen>
      <div className="absolute inset-0 overflow-hidden bg-background select-none">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
          <ScoreBar players={PLAYERS} score={step.score} />
        </div>
        <DriveButton direction="left" pressed={(step.held & BUTTON_LEFT) !== 0} colorId={0 as PlayerId} onPress={() => {}} />
        <DriveButton direction="right" pressed={(step.held & BUTTON_RIGHT) !== 0} colorId={0 as PlayerId} onPress={() => {}} />
        <div className="absolute top-0 left-0 p-4">
          <IconButton icon="close" label="Quit match" onClick={() => {}} />
        </div>
      </div>
    </AppScreen>
  );
}
