import { HIT_CAUSE } from "../../../shared/games/headcrash/types";
import type { Seat } from "../../../shared/games/types";
import { playSound } from "../../services/soundPlayer";
import { HEADCRASH_CLIENT_CONFIG } from "./config";
import type { FrameView, MomentView } from "./engine/frame";
import { bumpVolume, hitSound, landingTake } from "./headCrashCues";

const SOUND = HEADCRASH_CLIENT_CONFIG.sound;

/**
 * The match's sounds, driven by the game loop from what the netcode says happened. Only reads; simulation,
 * netcode and drawing know nothing of it. (The 3, 2, 1 is the overlay's: it sounds with its numbers.)
 */
export class HeadCrashAudio {
  private waterRising = false;

  /** `mySeat`: null when watching. */
  constructor(private readonly mySeat: Seat | null) {}

  update(frame: FrameView, moments: readonly MomentView[], now: number) {
    if (frame.waterRising && !this.waterRising) playSound("headCrashWaterRising");
    this.waterRising = frame.waterRising;
    for (const moment of moments) if (now - moment.at <= SOUND.momentMaxAgeMs) this.play(moment);
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
      case "land": {
        // Only your own car's weight is heard (and felt); the other's is seen.
        const take = moment.seat === this.mySeat ? landingTake(moment.impact, moment.airTicks) : null;
        if (take) playSound("headCrashLanding", take);
        return;
      }
      case "bump": {
        const volume = this.mySeat === null ? 0 : bumpVolume(moment.impact);
        if (volume > 0) playSound("headCrashCarBump", { volume });
      }
    }
  }
}
