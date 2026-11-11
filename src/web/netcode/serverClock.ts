/** How a clock settles: samples kept, how fast the shown clock eases to a new estimate, and when it just snaps. */
export interface ClockTuning {
  /** Clock samples kept; the fastest round trip among them sets the clock (least queueing). */
  clockSamples: number;
  /** The displayed clock eases toward a new estimate at this share of real time, so nothing jumps. */
  clockSlewRate: number;
  /** A clock error bigger than this is fixed at once (after a stall or a sleeping phone). */
  clockSnapMs: number;
}

interface Sample {
  rtt: number;
  /** Server time minus local (performance.now) time. */
  offset: number;
}

/**
 * The server's clock as seen from this device, from ping/pong round trips (shared by every real-time game).
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
    private readonly tuning: ClockTuning,
  ) {
    this.target = initialOffset;
    this.shown = initialOffset;
  }

  addPong(sentAt: number, serverTime: number, receivedAt: number) {
    const rtt = Math.max(0, receivedAt - sentAt);
    this.samples.push({ rtt, offset: serverTime - (sentAt + receivedAt) / 2 });
    if (this.samples.length > this.tuning.clockSamples) this.samples.shift();
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.target = best.offset;
    if (this.samples.length === 1) this.shown = this.target;
    this.jitterMs = this.samples.length === 1 ? rtt / 4 : this.jitterMs * 0.8 + Math.abs(rtt - this.rttMs) * 0.2;
    this.rttMs = this.samples.length === 1 ? rtt : this.rttMs * 0.8 + rtt * 0.2;
  }

  /** Forgets every sample (the tab slept: old round trips say nothing about now). */
  reset() {
    this.samples = [];
  }

  /** Server time now, eased (call once per frame or more; it advances the easing). */
  serverNow(now: number): number {
    const elapsed = this.lastShownAt === null ? 0 : Math.max(0, now - this.lastShownAt);
    this.lastShownAt = now;
    const diff = this.target - this.shown;
    if (Math.abs(diff) > this.tuning.clockSnapMs) this.shown = this.target;
    else this.shown += Math.max(-elapsed * this.tuning.clockSlewRate, Math.min(elapsed * this.tuning.clockSlewRate, diff));
    return now + this.shown;
  }
}
