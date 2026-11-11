import type { Ticker } from "./ports";

interface Lane {
  intervalMs: number;
  onTick: (() => void) | null;
}

/**
 * Lets several services share the host's one timer. Each gets its own `Ticker`; the host's runs at the quickest
 * pace any of them asked for, only while one of them is running (so the host can still sleep otherwise).
 */
export class TickerHub {
  private readonly lanes: Lane[] = [];
  private intervalMs: number | null = null;

  constructor(private readonly base: Ticker) {}

  lane(): Ticker {
    const lane: Lane = { intervalMs: 0, onTick: null };
    this.lanes.push(lane);
    return {
      start: (intervalMs, onTick) => {
        if (lane.onTick) return;
        lane.intervalMs = intervalMs;
        lane.onTick = onTick;
        this.retime();
      },
      stop: () => {
        if (!lane.onTick) return;
        lane.onTick = null;
        this.retime();
      },
    };
  }

  private retime() {
    const running = this.lanes.filter((lane) => lane.onTick);
    const wanted = running.length ? Math.min(...running.map((lane) => lane.intervalMs)) : null;
    if (wanted === this.intervalMs) return;
    this.base.stop();
    this.intervalMs = wanted;
    // A slower service is simply asked more often than it needs; it steps only when a step is due.
    if (wanted !== null) this.base.start(wanted, () => this.lanes.forEach((lane) => lane.onTick?.()));
  }
}
