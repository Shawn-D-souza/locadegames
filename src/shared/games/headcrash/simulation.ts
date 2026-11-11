import type { Seat } from "../types";
import { HEADCRASH_CONFIG } from "./config";
import { layoutFor } from "./layout";
import { findHit, stepCars, type StepReport } from "./physics";
import { PHASE, type Car, type HeadCrashOutcome, type HeadCrashState, type Layout, type Motion } from "./types";

/**
 * A whole Head Crash match as one pure simulation: state + the buttons held → the next step. Rounds, the
 * countdown, the pause after a hit, the score and the rising water are all part of it, so the server and both
 * phones run exactly the same match.
 */

const C = HEADCRASH_CONFIG;
const STEP_SECONDS = 1 / C.tickRate;

const copyCar = (car: Car): Car => ({ ...car });

/** How long the countdown before this round is. */
export const countdownTicksFor = (firstRound: boolean) => (firstRound ? C.firstCountdownTicks : C.countdownTicks);

/** The number the countdown shows (3, 2, 1), or 0 when the match isn't counting down. */
export function countdownNumber(state: Pick<HeadCrashState, "phase" | "tick" | "phaseTicks">): number {
  if (state.phase !== PHASE.countdown) return 0;
  // Only a match's very first countdown starts at step 0, so its steps and steps left add up to its length.
  const first = state.tick + state.phaseTicks === C.firstCountdownTicks;
  return Math.ceil((state.phaseTicks * 3) / countdownTicksFor(first));
}

/** `round` and `score`: where to pick up a match the server lost (a fresh match starts at 0 and 0–0). */
export function createHeadCrash(seed: number, round = 0, score: readonly [number, number] = [0, 0]): HeadCrashState {
  const layout = layoutFor(seed, round);
  return {
    seed,
    tick: 0,
    round,
    phase: PHASE.countdown,
    phaseTicks: countdownTicksFor(true),
    score: [score[0], score[1]],
    deadRounds: 0,
    cars: [copyCar(layout.spawns[0]), copyCar(layout.spawns[1])],
    buttons: [0, 0],
    hit: null,
  };
}

export function cloneHeadCrash(state: HeadCrashState): HeadCrashState {
  return {
    ...state,
    score: [state.score[0], state.score[1]],
    cars: [copyCar(state.cars[0]), copyCar(state.cars[1])],
    buttons: [state.buttons[0], state.buttons[1]],
    hit: state.hit && { ...state.hit, victims: [state.hit.victims[0], state.hit.victims[1]] },
  };
}

export const layoutOf = (state: HeadCrashState): Layout => layoutFor(state.seed, state.round);

/** What moves in the map as the state stands: the lifts wait at the bottom in the countdown and stay where a hit left them. */
export const motionOf = (state: Pick<HeadCrashState, "phase" | "phaseTicks" | "hit">): Motion => ({
  playTicks: state.phase === PHASE.play ? state.phaseTicks : (state.hit?.playTicks ?? 0),
});

/** How high the water stands after `playTicks` steps of play: a shallow pool, then rising to the ceiling. */
export function waterLevel(layout: Layout, playTicks: number): number {
  const pool = layout.floorY + C.water.startDepth;
  const rise = Math.max(0, Math.min(1, (playTicks - C.water.startTicks) / C.water.riseTicks));
  return pool + (layout.topY + 0.5 - pool) * rise;
}

/** The water as the state stands (still during the countdown, held where it was after a hit). */
export function waterOf(state: HeadCrashState): number {
  const layout = layoutOf(state);
  if (state.phase === PHASE.play) return waterLevel(layout, state.phaseTicks);
  if (state.phase === PHASE.countdown || !state.hit) return waterLevel(layout, 0);
  return state.hit.waterY;
}

/** Who scored with this hit: the seat whose head was not hit, or null when both were. */
export function scorerOf(victims: readonly [boolean, boolean]): Seat | null {
  if (victims[0] === victims[1]) return null;
  return victims[0] ? 1 : 0;
}

export function outcomeOf(state: HeadCrashState): HeadCrashOutcome | null {
  if (state.phase !== PHASE.over) return null;
  if (state.score[0] === state.score[1]) return { kind: "draw" };
  return { kind: "win", seat: state.score[0] > state.score[1] ? 0 : 1 };
}

function startRound(state: HeadCrashState, round: number) {
  const layout = layoutFor(state.seed, round);
  state.round = round;
  state.phase = PHASE.countdown;
  state.phaseTicks = countdownTicksFor(false);
  state.cars = [copyCar(layout.spawns[0]), copyCar(layout.spawns[1])];
  state.hit = null;
}

/** Advances the match one step, in place. `buttons`: what each seat holds from this step on. */
export function stepHeadCrash(state: HeadCrashState, buttons: readonly [number, number], report?: StepReport) {
  // A finished match stays exactly as it ended.
  if (state.phase === PHASE.over) return;
  state.tick += 1;
  state.buttons[0] = buttons[0];
  state.buttons[1] = buttons[1];
  switch (state.phase) {
    case PHASE.countdown:
      state.phaseTicks -= 1;
      if (state.phaseTicks <= 0) {
        state.phase = PHASE.play;
        state.phaseTicks = 0;
      }
      return;
    case PHASE.play: {
      const layout = layoutOf(state);
      state.phaseTicks += 1;
      const motion = motionOf(state);
      stepCars(state.cars, state.buttons, layout, STEP_SECONDS, report, motion);
      const waterY = waterLevel(layout, state.phaseTicks);
      const hit = findHit(state.cars, layout, waterY, motion);
      if (!hit) return;
      state.hit = { ...hit, waterY, playTicks: state.phaseTicks };
      const scorer = scorerOf(hit.victims);
      if (scorer === null) state.deadRounds += 1;
      else {
        state.deadRounds = 0;
        state.score[scorer] += 1;
      }
      const over = state.score[0] >= C.pointsToWin || state.score[1] >= C.pointsToWin || state.deadRounds >= C.maxDeadRounds;
      state.phase = over ? PHASE.over : PHASE.hit;
      state.phaseTicks = over ? 0 : C.hitPauseTicks;
      return;
    }
    case PHASE.hit:
      state.phaseTicks -= 1;
      if (state.phaseTicks <= 0) startRound(state, state.round + 1);
  }
}
