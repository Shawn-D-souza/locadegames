import { headLimit } from "../../../shared/games/territory/arena";
import { TERRITORY_CONFIG } from "../../../shared/games/territory/config";
import type { PlayerId } from "../../../shared/rooms/types";
import { playSound, startSoundLoop, type LoopHandle } from "../../services/soundPlayer";
import type { SoundName } from "../../sound/soundBook";
import { TERRITORY_CLIENT_CONFIG } from "./config";
import type { FrameView, MomentView, PlayerFrame } from "./engine/frame";
import { captureSound, distanceVolume, onRivalLand, outSound, trailCourse, trailShape } from "./territoryCues";

const SOUND = TERRITORY_CLIENT_CONFIG.sound;
const HEAD_GAP = TERRITORY_CONFIG.headRadius * 2;

interface AudioOptions {
  myId: PlayerId;
  playing: boolean;
  radius: number;
}

/**
 * The match's sounds, driven by the game loop: what the netcode says happened, plus what's seen frame to frame
 * (your trail, your head touching things). Only reads; simulation, netcode and drawing know nothing of it.
 */
export class TerritoryAudio {
  private trail: LoopHandle | null = null;
  private onRival = false;
  private rivalCheckedAt = -Infinity;
  private trailStartedAt = 0;
  /** Whether the trail's course was set for rival land (null: not set yet). */
  private courseOnRival: boolean | null = null;
  private touchingHead = false;
  private touchingWall = false;
  private readonly wallLimit: number;

  constructor(private readonly options: AudioOptions) {
    this.wallLimit = headLimit(options.radius);
  }

  update(frame: FrameView, moments: readonly MomentView[], now: number) {
    const me = this.options.playing && !frame.ending ? frame.players.find((p) => p.isMe && p.head) : undefined;
    this.updateTrail(me, frame, now);
    if (me) this.updateTouches(me, frame);
    for (const moment of moments) if (now - moment.at <= SOUND.momentMaxAgeMs) this.play(moment, frame);
  }

  stop() {
    this.trail?.stop();
    this.trail = null;
    this.onRival = false;
    this.courseOnRival = null;
    this.rivalCheckedAt = -Infinity;
  }

  private play(moment: MomentView, frame: FrameView) {
    if (moment.kind === "capture") {
      playSound(captureSound(moment.area));
      return;
    }
    const sound = outSound(moment, this.options.myId);
    if (!sound) return;
    if (sound === "territoryPlayerBurst") this.playAt(sound, moment, frame);
    else playSound(sound);
  }

  /** Others' events, as far away as they are. */
  private playAt(sound: SoundName, at: { x: number; y: number }, frame: FrameView) {
    const volume = frame.focus ? distanceVolume(Math.hypot(at.x - frame.focus.x, at.y - frame.focus.y)) : SOUND.watchingVolume;
    if (volume > 0) playSound(sound, { volume });
  }

  private updateTrail(me: PlayerFrame | undefined, frame: FrameView, now: number) {
    const out = !!me?.trail;
    if (out && !this.trail) {
      playSound("territoryLeftLand");
      this.trail = startSoundLoop("territoryTrailLoop");
      this.trailStartedAt = now;
    }
    if (!out) {
      this.stop();
      return;
    }
    if (now - this.rivalCheckedAt >= SOUND.rivalLandCheckMs) {
      this.rivalCheckedAt = now;
      this.onRival = !!me?.head && onRivalLand(me.head, frame.players);
    }
    // Only when it changes: the build-up over the whole time out is handed to the audio clock in one go.
    if (this.courseOnRival !== this.onRival) {
      this.courseOnRival = this.onRival;
      this.trail?.glide(trailCourse(this.onRival, (now - this.trailStartedAt) / SOUND.trailBuildMs));
      this.trail?.setTone(trailShape(this.onRival, 0).cutoffHz);
    }
  }

  private updateTouches(me: PlayerFrame, frame: FrameView) {
    const head = me.head!;
    let nearest = Infinity;
    for (const other of frame.players) {
      if (other !== me && other.head) nearest = Math.min(nearest, Math.hypot(other.head.x - head.x, other.head.y - head.y));
    }
    if (!this.touchingHead && nearest <= HEAD_GAP * SOUND.bumpShare) {
      this.touchingHead = true;
      playSound("territoryHeadBump");
    } else if (nearest > HEAD_GAP * SOUND.bumpFreeShare) this.touchingHead = false;

    const fromMiddle = Math.hypot(head.x, head.y);
    if (!this.touchingWall && fromMiddle >= this.wallLimit - SOUND.wallTouch) {
      this.touchingWall = true;
      playSound("territoryWallBump");
    } else if (fromMiddle < this.wallLimit - SOUND.wallFree) this.touchingWall = false;
  }
}
