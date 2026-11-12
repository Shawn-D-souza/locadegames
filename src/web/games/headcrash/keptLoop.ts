import { isSilentLoop, startSoundLoop, type LoopHandle } from "../../services/soundPlayer";
import type { SoundName } from "../../sound/soundBook";

/**
 * A looping sound that should keep going while the game wants it: started when first needed, and asked for again
 * while it can't play yet (its file still loading, sound off, or audio not yet woken by a touch).
 */
export class KeptLoop {
  private handle: LoopHandle | null = null;

  constructor(private readonly name: SoundName) {}

  get running() {
    return this.handle !== null;
  }

  /** The loop, going; `fresh` when it was (re)started just now and should be told where to be at once. */
  ensure(): { loop: LoopHandle; fresh: boolean } {
    if (this.handle && !isSilentLoop(this.handle)) return { loop: this.handle, fresh: false };
    this.handle = startSoundLoop(this.name);
    return { loop: this.handle, fresh: true };
  }

  stop() {
    this.handle?.stop();
    this.handle = null;
  }
}
