import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { TERRITORY_CLIENT_CONFIG } from "../config";

const NET = TERRITORY_CLIENT_CONFIG.net;

interface Sample {
  rtt: number;
  /** Server time minus local (performance.now) time. */
  offset: number;
}

/**
 * The server's clock and step counter as seen from this device, from ping/pong round trips.
 * The fastest recent round trip sets the offset (it waited least in queues); the shown clock
 * eases toward new estimates so drawing never jumps. All times are `performance.now()` based.
 */
export class ServerClock {
  private samples: Sample[] = [];
  private target: number;
  private shown: number;
  private lastShownAt: number | null = null;
  /** Smoothed round trip and its spread. */
  rttMs = 150;
  jitterMs = 30;

  constructor(
    initialOffset: number,
    public tickZeroAt: number,
  ) {
    this.target = initialOffset;
    this.shown = initialOffset;
  }

  addPong(sentAt: number, serverTime: number, receivedAt: number, tickZeroAt: number) {
    const rtt = Math.max(0, receivedAt - sentAt);
    this.samples.push({ rtt, offset: serverTime - (sentAt + receivedAt) / 2 });
    if (this.samples.length > NET.clockSamples) this.samples.shift();
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.target = best.offset;
    if (this.samples.length === 1) this.shown = this.target;
    this.jitterMs = this.samples.length === 1 ? rtt / 4 : this.jitterMs * 0.8 + Math.abs(rtt - this.rttMs) * 0.2;
    this.rttMs = this.samples.length === 1 ? rtt : this.rttMs * 0.8 + rtt * 0.2;
    this.tickZeroAt = tickZeroAt;
  }

  /** Server time now, eased (call once per frame or more; it advances the easing). */
  serverNow(now: number): number {
    const elapsed = this.lastShownAt === null ? 0 : Math.max(0, now - this.lastShownAt);
    this.lastShownAt = now;
    const diff = this.target - this.shown;
    if (Math.abs(diff) > NET.clockSnapMs) this.shown = this.target;
    else this.shown += Math.max(-elapsed * NET.clockSlewRate, Math.min(elapsed * NET.clockSlewRate, diff));
    return now + this.shown;
  }

  /** Fractional server step at a server time. */
  tickAt(serverTime: number): number {
    return (serverTime - this.tickZeroAt) / TERRITORY_CONFIG.tickMs;
  }

  /** Server time a step happens at. */
  timeOfTick(tick: number): number {
    return this.tickZeroAt + tick * TERRITORY_CONFIG.tickMs;
  }
}
