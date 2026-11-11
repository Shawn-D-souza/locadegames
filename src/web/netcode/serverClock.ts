/** How a clock settles: samples kept, how fast the shown clock eases to a new estimate, and when it just snaps. */
export interface ClockTuning {
  /** Clock samples kept; the fastest round trip among them sets the clock (least queueing). */
  clockSamples: number;
  /** The displayed clock eases toward a new estimate at this share of real time, so nothing jumps. */
  clockSlewRate: number;
  /**
   * A clock error bigger than this is fixed at once (after a stall or a sleeping phone), but only when it is also
   * bigger than the fastest round trip: a slow sample can be wrong by up to half its trip, so it is eased in instead.
   */
  clockSnapMs: number;
}

interface Sample {
  rtt: number;
  /** Server time minus local (performance.now) time. */
  offset: number;
}

/** The middle of sorted numbers (the lower of the two middle ones for an even count, so one slow sample of two never counts). */
const lowerMedian = (sorted: readonly number[]) => sorted[Math.floor((sorted.length - 1) / 2)]!;

/**
 * The server's clock as seen from this device, from ping/pong round trips (shared by every real-time game).
 * The fastest recent round trip sets the offset (it waited least in queues); the shown clock eases toward new
 * estimates so drawing never jumps. The round trip and its jitter are medians of the recent samples, so one pong
 * that arrived late (the page was busy, a hiccup on the line) never moves them. All times are `performance.now()` based.
 */
export class ServerClock {
  private samples: Sample[] = [];
  private target: number;
  private shown: number;
  private lastShownAt: number | null = null;
  /** The fastest round trip kept (how far the clock's estimate can be off: half of it at most). */
  private bestRttMs = Infinity;
  /** A trustworthy sample has set the clock since the start (or since the tab woke). */
  private settled = false;
  /** Typical round trip and how much it varies (before any pong: a cautious guess). */
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
    this.bestRttMs = best.rtt;
    // The first sample quick enough to trust sets the clock at once; until then the room's guess is eased toward it.
    if (!this.settled && best.rtt <= this.tuning.clockSnapMs) {
      this.shown = this.target;
      this.settled = true;
    }
    const trips = this.samples.map((sample) => sample.rtt).sort((a, b) => a - b);
    this.rttMs = lowerMedian(trips);
    this.jitterMs = lowerMedian(trips.map((trip) => Math.abs(trip - this.rttMs)).sort((a, b) => a - b));
  }

  /** Forgets every sample (the tab slept: old round trips say nothing about now). */
  reset() {
    this.samples = [];
    this.bestRttMs = Infinity;
    this.settled = false;
  }

  /** Server time now, eased (call once per frame or more; it advances the easing). */
  serverNow(now: number): number {
    const elapsed = this.lastShownAt === null ? 0 : Math.max(0, now - this.lastShownAt);
    this.lastShownAt = now;
    const diff = this.target - this.shown;
    if (Math.abs(diff) > this.tuning.clockSnapMs && Math.abs(diff) > this.bestRttMs) this.shown = this.target;
    else this.shown += Math.max(-elapsed * this.tuning.clockSlewRate, Math.min(elapsed * this.tuning.clockSlewRate, diff));
    return now + this.shown;
  }
}
