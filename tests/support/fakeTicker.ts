import type { Ticker } from "../../src/server/rooms/ports";

/** A Ticker the test drives by hand: `fire()` runs one loop, as the host's timer would. */
export class FakeTicker implements Ticker {
  private onTick: (() => void) | null = null;

  get running(): boolean {
    return this.onTick !== null;
  }

  start(_intervalMs: number, onTick: () => void) {
    this.onTick ??= onTick;
  }

  stop() {
    this.onTick = null;
  }

  fire() {
    this.onTick?.();
  }
}
