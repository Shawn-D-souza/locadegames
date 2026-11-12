import { HEADCRASH_CONFIG } from "../../../shared/games/headcrash/config";
import { liftShare } from "../../../shared/games/headcrash/layout";
import type { Seat } from "../../../shared/games/types";
import type { EndingTone } from "../../sound/cues/endingCues";
import type { SoundName, SoundStep } from "../../sound/soundBook";
import { HEADCRASH_CLIENT_CONFIG } from "./config";

/** Which sound goes with what in a Head Crash match: pure decisions, so they can be tested. */

const { sound: SOUND, hud: HUD } = HEADCRASH_CLIENT_CONFIG;

/** The sound of a head being hit, for whoever is looking: your point, your head, both heads, or a match you watch. */
export function hitSound(scorer: Seat | null, mySeat: Seat | null): SoundName {
  if (mySeat === null) return "headCrashWatchedHit";
  if (scorer === null) return "headCrashBothHeadsHit";
  return scorer === mySeat ? "headCrashYouScored" : "headCrashYouWereHit";
}

/** Which landing take a landing this hard gets, and how loud; null when it is too soft (or too short a hop) to hear. */
export function landingTake(impact: number, airTicks: number): { variant: number; volume: number } | null {
  return airTicks < SOUND.minAirTicks ? null : impactTake(impact);
}

/** Which take (soft or hard) an impact this hard gets, and how loud; null when it is too soft to hear. Your landings and your car's body knocking the rock. */
export function impactTake(impact: number): { variant: number; volume: number } | null {
  if (impact < SOUND.minImpact) return null;
  const strength = Math.min(1, (impact - SOUND.minImpact) / (SOUND.hardImpact - SOUND.minImpact));
  return { variant: strength >= 0.6 ? 1 : 0, volume: 0.55 + 0.45 * strength };
}

/** The lifts' fastest (share of their trip a second, mid-trip). */
const LIFT_TOP_SPEED = Math.PI / (2 * HEADCRASH_CONFIG.gadgets.liftMove);

/** How the lifts' winch sounds after `playTicks` steps of play (they all keep the same timetable): as loud as they are fast, higher going up. */
export function liftHum(playTicks: number): { volume: number; rate: number } {
  const { speed } = liftShare(playTicks);
  const { upRate, downRate } = SOUND.lift;
  return { volume: Math.min(1, Math.abs(speed) / LIFT_TOP_SPEED), rate: speed >= 0 ? upRate : downRate };
}

/** Your car's motor as a small engine: its revs (playback rate) and throttle (0 … 1). */
export interface MotorState {
  rpm: number;
  load: number;
}

/** What drives the motor this frame. */
export interface MotorInput {
  /** A button is held. */
  held: boolean;
  /** The car's speed (m/s). */
  speed: number;
  grounded: boolean;
}

export const idleMotor = (): MotorState => ({ rpm: SOUND.motor.idle.rate, load: 0 });

/** Where the revs are heading: with the car's speed on the ground, ahead of it as it sets off, free in the air. */
export function motorTargetRpm({ held, speed, grounded }: MotorInput): number {
  const { idle, topRate, maxRate, launch } = SOUND.motor;
  if (!grounded) return held ? maxRate : idle.rate;
  const pace = Math.min(1, speed / HEADCRASH_CONFIG.drive.maxSpeed);
  return idle.rate + (topRate - idle.rate) * pace + (held ? launch * (1 - pace) : 0);
}

const toward = (from: number, to: number, rise: number, fall: number, seconds: number) =>
  to > from ? Math.min(to, from + rise * seconds) : Math.max(to, from - fall * seconds);

/** The motor `seconds` later: its revs and throttle each move toward where they should be, never jumping. */
export function stepMotor(state: MotorState, input: MotorInput, seconds: number): MotorState {
  const { rpmRise, rpmFall, loadRise, loadFall } = SOUND.motor;
  return {
    rpm: toward(state.rpm, motorTargetRpm(input), rpmRise, rpmFall, seconds),
    load: toward(state.load, input.held ? 1 : 0, loadRise, loadFall, seconds),
  };
}

/** How the motor sounds: louder on the throttle and the higher it revs, its tone opening with the throttle. */
export function motorSound({ rpm, load }: MotorState): { volume: number; rate: number; cutoffHz: number } {
  const { idle, maxRate, loadVolume, closedHz, openHz } = SOUND.motor;
  const revs = Math.max(0, Math.min(1, (rpm - idle.rate) / (maxRate - idle.rate)));
  const volume = idle.volume + loadVolume * load + (1 - idle.volume - loadVolume) * revs;
  return { volume, rate: rpm, cutoffHz: closedHz * Math.pow(openHz / closedHz, load) };
}

/** How loud a knock between the cars is; 0 when it is only a nudge. */
export function bumpVolume(impact: number): number {
  if (impact < SOUND.minImpact) return 0;
  return 0.5 + 0.5 * Math.min(1, (impact - SOUND.minImpact) / (SOUND.hardImpact - SOUND.minImpact));
}

/** The result of the match, as the tag stamps on (the last hit has had its own sound by then). */
export function headCrashEndingSteps(tone: EndingTone): SoundStep[] {
  const sound: SoundName = tone === "win" ? "matchWinFanfare" : tone === "lose" ? "matchLossSting" : tone === "draw" ? "matchDrawShrug" : "matchWatchedResult";
  return [{ sound, at: HUD.endTagAtMs }];
}
