import { buttonDirection } from "../../../shared/games/headcrash/config";
import { HIT_CAUSE, PHASE } from "../../../shared/games/headcrash/types";
import type { Seat } from "../../../shared/games/types";
import { playSound } from "../../services/soundPlayer";
import { HEADCRASH_CLIENT_CONFIG } from "./config";
import type { FrameView, MomentView } from "./engine/frame";
import { KeptLoop } from "./keptLoop";
import { bumpVolume, hitSound, idleMotor, impactTake, landingTake, liftHum, motorSound, stepMotor, type MotorState } from "./headCrashCues";

const SOUND = HEADCRASH_CLIENT_CONFIG.sound;
const MOTOR = SOUND.motor;
const LIFT = SOUND.lift;

/**
 * The match's sounds, driven by the game loop: what the netcode says happened, plus what's seen frame to frame
 * (your car's motor, the lift moving). Only reads; simulation, netcode and drawing know nothing of it. (The 3, 2, 1
 * is the overlay's: it sounds with its numbers.)
 */
export class HeadCrashAudio {
  private waterRising = false;
  private readonly lift = new KeptLoop("headCrashLiftLoop");
  private liftSetAt = -Infinity;
  private liftSilentSince: number | null = null;
  private readonly motor = new KeptLoop("headCrashMotorLoop");
  private engine: MotorState = idleMotor();
  private engineAt: number | null = null;
  private motorSetAt = -Infinity;
  /** The tone last sent (Hz). */
  private motorTone = 0;
  /** The match is over and the motor was cut, and when. */
  private motorCutAt: number | null = null;

  /** `mySeat`: null when watching. */
  constructor(private readonly mySeat: Seat | null) {}

  update(frame: FrameView, moments: readonly MomentView[], now: number) {
    if (frame.waterRising && !this.waterRising) playSound("headCrashWaterRising");
    this.waterRising = frame.waterRising;
    this.updateLift(frame, now);
    this.updateMotor(frame, now);
    for (const moment of moments) if (now - moment.at <= SOUND.momentMaxAgeMs) this.play(moment);
  }

  /** Stops everything still sounding (the screen is going). */
  stop() {
    this.stopMotor();
    this.stopLift();
  }

  private play(moment: MomentView) {
    switch (moment.kind) {
      case "go":
        playSound("countdownGo");
        return;
      case "hit":
        playSound(hitSound(moment.scorer, this.mySeat));
        if (moment.hit.cause === HIT_CAUSE.water) playSound("headCrashSplash");
        return;
      case "bump": {
        const volume = this.mySeat === null ? 0 : bumpVolume(moment.impact);
        if (volume > 0) playSound("headCrashCarBump", { volume });
        return;
      }
    }
    // Only your own car's weight and gadgets are heard (and felt); the other's are seen.
    if (moment.seat !== this.mySeat) return;
    switch (moment.kind) {
      case "land": {
        const take = landingTake(moment.impact, moment.airTicks);
        if (take) playSound("headCrashLanding", take);
        return;
      }
      case "knock": {
        const take = impactTake(moment.impact);
        if (take) playSound("headCrashKnock", take);
        return;
      }
      case "pad":
        playSound("headCrashPadThrow");
        return;
      case "fan":
        playSound("headCrashFanAir");
    }
  }

  /**
   * The map's lift moving, for everyone (it is the map's, not a car's): its winch swells and fades with the lift's
   * speed, on its own timetable, so each update is a ramp to where it will be at the next.
   */
  private updateLift(frame: FrameView, now: number) {
    const moving = frame.layout.lifts.length > 0 && frame.phase === PHASE.play && !frame.hit;
    const { volume, rate } = moving ? liftHum(frame.motion.playTicks) : { volume: 0, rate: 1 };
    if (volume > 0) this.liftSilentSince = null;
    else if (this.lift.running && this.liftSilentSince === null) this.liftSilentSince = now;
    if (this.lift.running && this.liftSilentSince !== null && now - this.liftSilentSince >= LIFT.idleStopMs) {
      this.stopLift();
      return;
    }
    if (!this.lift.running && volume === 0) return;
    const { loop, fresh } = this.lift.ensure();
    if (!fresh && now - this.liftSetAt < LIFT.updateMs) return;
    this.liftSetAt = now;
    loop.glide([{ inSeconds: LIFT.updateMs / 1000, volume, rate }]);
  }

  private stopMotor() {
    this.motor.stop();
    this.motorCutAt = null;
  }

  private stopLift() {
    this.lift.stop();
    this.liftSilentSince = null;
  }

  /**
   * Your own car's motor: a small engine stepped every frame (its revs and throttle never jump), sent to the loop as a
   * ramp to where it will be at the next update, so the sound moves continuously. It runs the whole match without a
   * break: from the first countdown, idling down through the pause after each hit and on into the next round, and
   * fades out only when the match is over.
   */
  private updateMotor(frame: FrameView, now: number) {
    if (this.mySeat === null) return;
    if (frame.phase === PHASE.over) {
      if (this.motor.running && this.motorCutAt === null) {
        this.motorCutAt = now;
        this.motor.ensure().loop.glide([{ inSeconds: MOTOR.cutMs / 1000, volume: 0, rate: this.engine.rpm }]);
      }
      if (this.motorCutAt !== null && now - this.motorCutAt >= MOTOR.idleStopMs) this.stopMotor();
      return;
    }
    const car = frame.cars[this.mySeat];
    // While the round is held (a hit's pause), the motor idles down whatever the buttons say.
    const driving = (frame.phase === PHASE.countdown || frame.phase === PHASE.play) && !frame.hit;
    // A long gap (the tab was away) isn't driven through.
    const seconds = this.engineAt === null ? 0 : Math.min(0.1, (now - this.engineAt) / 1000);
    this.engineAt = now;
    const input = driving ? { held: buttonDirection(car.buttons) !== 0, speed: Math.hypot(car.vx, car.vy), grounded: car.grounded } : { held: false, speed: 0, grounded: true };
    this.engine = stepMotor(this.engine, input, seconds);
    const { loop, fresh } = this.motor.ensure();
    if (fresh) this.motorTone = 0;
    if (!fresh && now - this.motorSetAt < MOTOR.updateMs) return;
    this.motorSetAt = now;
    const { volume, rate, cutoffHz } = motorSound(this.engine);
    // Each update ramps to now's value over one update's length, so the ramps join end to end.
    loop.glide([{ inSeconds: MOTOR.updateMs / 1000, volume, rate }]);
    if (Math.abs(cutoffHz - this.motorTone) > this.motorTone * 0.05) {
      this.motorTone = cutoffHz;
      loop.setTone(cutoffHz);
    }
  }
}
