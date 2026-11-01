import type { ArenaResult } from "../../shared/arena/types";
import { TERRITORY_CONFIG } from "../../shared/games/territory/config";
import { rankTerritory } from "../../shared/games/territory/ranking";
import { arenaShape, createTerritory, stepTerritory } from "../../shared/games/territory/simulation";
import type { TerritoryState } from "../../shared/games/territory/types";
import type { ArenaShape } from "../../shared/games/territory/capture";
import { encodeFullSync, encodeSnapshot, type HeadFrame } from "../../shared/games/territory/wire";
import type { PlayerId } from "../../shared/rooms/types";
import { ARENA_SERVER_CONFIG } from "./config";

interface QueuedInput {
  seq: number;
  tick: number;
  target: number;
}

/** Newer in u16 sequence space (inputs wrap after 65,535). */
const isNewer = (seq: number, than: number) => {
  const diff = (seq - than) & 0xffff;
  return diff > 0 && diff < 0x8000;
};

/**
 * One live Territory match on the server: the authoritative state, each player's queued steering,
 * and the fixed-step clock. Portable: no Cloudflare APIs, the host only calls `advance(now)` often.
 */
export class TerritoryMatch {
  readonly state: TerritoryState;
  private readonly shape: ArenaShape;
  private readonly queues = new Map<PlayerId, QueuedInput[]>();
  private readonly received = new Map<PlayerId, number>();
  private readonly applied = new Map<PlayerId, number>();
  private readonly late = new Map<PlayerId, number>();
  private quits: PlayerId[] = [];

  /** `tickZeroAt`: server time of step 0 (the end of the countdown). Moves later if the server stalls. */
  constructor(
    entrantIds: readonly PlayerId[],
    radius: number,
    public tickZeroAt: number,
  ) {
    this.state = createTerritory(entrantIds, radius);
    this.shape = arenaShape(radius);
    for (const id of entrantIds) this.queues.set(id, []);
  }

  /** A steering change meant for step `tick` (the client runs ahead so it arrives in time). */
  input(id: PlayerId, seq: number, tick: number, target: number) {
    const queue = this.queues.get(id);
    if (!queue || queue.length >= ARENA_SERVER_CONFIG.maxQueuedInputs) return;
    if (!isNewer(seq, this.received.get(id) ?? 0)) return;
    this.received.set(id, seq);
    // Never further ahead than the client could honestly be.
    const latest = this.state.tick + ARENA_SERVER_CONFIG.maxInputLeadTicks;
    queue.push({ seq, tick: Math.min(tick, latest), target });
  }

  quit(id: PlayerId) {
    if (!this.quits.includes(id)) this.quits.push(id);
  }

  get ended(): boolean {
    return this.state.ended;
  }

  /** Runs every step due by `now`; returns one encoded snapshot per step, in order. */
  advance(now: number): Uint8Array[] {
    const { tickMs } = TERRITORY_CONFIG;
    let due = Math.floor((now - this.tickZeroAt) / tickMs);
    // After a long stall, skip the lost time instead of fast-forwarding through it.
    const behind = due - this.state.tick - ARENA_SERVER_CONFIG.maxCatchUpTicks;
    if (behind > 0) {
      this.tickZeroAt += behind * tickMs;
      due -= behind;
    }
    const out: Uint8Array[] = [];
    while (this.state.tick < due && !this.state.ended) out.push(this.step());
    return out;
  }

  private step(): Uint8Array {
    const next = this.state.tick + 1;
    const targets = new Map<PlayerId, number>();
    for (const [id, queue] of this.queues) {
      while (queue.length && queue[0]!.tick <= next) {
        const input = queue.shift()!;
        if (input.tick < next) this.late.set(id, ((this.late.get(id) ?? 0) + 1) & 0xff);
        targets.set(id, input.target);
        this.applied.set(id, input.seq);
      }
    }
    const events = stepTerritory(this.state, this.shape, { targets, quits: this.quits });
    this.quits = [];
    const heads: HeadFrame[] = this.state.players
      .filter((p) => p.alive)
      .map((p) => ({
        id: p.id,
        outside: p.trail.length > 0,
        x: p.x,
        y: p.y,
        heading: p.heading,
        target: p.target,
        inputSeq: this.applied.get(p.id) ?? 0,
        late: this.late.get(p.id) ?? 0,
      }));
    return encodeSnapshot({ tick: this.state.tick, heads, events });
  }

  fullSync(): Uint8Array {
    return encodeFullSync({
      tick: this.state.tick,
      radius: this.state.radius,
      ended: this.state.ended,
      players: this.state.players.map((p) => ({ ...p, inputSeq: this.applied.get(p.id) ?? 0, late: this.late.get(p.id) ?? 0 })),
    });
  }

  results(): ArenaResult[] {
    return rankTerritory(this.state);
  }
}
