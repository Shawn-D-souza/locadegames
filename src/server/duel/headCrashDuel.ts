import { HEADCRASH_CONFIG } from "../../shared/games/headcrash/config";
import { createHeadCrash, outcomeOf, stepHeadCrash } from "../../shared/games/headcrash/simulation";
import { PHASE, type HeadCrashOutcome, type HeadCrashState } from "../../shared/games/headcrash/types";
import { encodeSnapshot, isNewerSeq, type PendingInput } from "../../shared/games/headcrash/wire";
import type { Seat } from "../../shared/games/types";
import type { Bytes } from "../../shared/protocol/bytes";
import { DUEL_SERVER_CONFIG } from "./config";

interface QueuedInput {
  seq: number;
  tick: number;
  buttons: number;
}

/**
 * One live Head Crash match on the server: the authoritative state, each player's queued buttons, and the
 * fixed-step clock. Portable: no Cloudflare APIs, the host only calls `advance(now)` often.
 */
export class HeadCrashDuel {
  readonly state: HeadCrashState;
  private readonly queues: [QueuedInput[], QueuedInput[]] = [[], []];
  private readonly received: [number, number] = [0, 0];
  private readonly applied: [number, number] = [0, 0];
  private readonly late: [number, number] = [0, 0];
  private readonly held: [number, number] = [0, 0];
  /** What the last snapshot said, to tell when the next one is due. */
  private sentTick = -1;
  private sentPhase = -1;

  /**
   * `score`: 0–0, or where to pick the match up after the server lost it (it then starts a fresh round).
   * `tickZeroAt`: server time of step 0 (the countdown starts then). Moves later if the server stalls.
   */
  constructor(
    readonly matchId: number,
    seed: number,
    score: readonly [number, number],
    public tickZeroAt: number,
  ) {
    this.state = createHeadCrash(seed, score[0] + score[1], score);
  }

  /** A change of buttons meant for step `tick` (the client runs ahead so it arrives in time). */
  input(seat: Seat, seq: number, tick: number, buttons: number) {
    const queue = this.queues[seat];
    if (queue.length >= DUEL_SERVER_CONFIG.maxQueuedInputs || !isNewerSeq(seq, this.received[seat])) return;
    this.received[seat] = seq;
    // Never further ahead than the client could honestly be, and never before one already waiting.
    const latest = this.state.tick + DUEL_SERVER_CONFIG.maxInputLeadTicks;
    const earliest = queue.length ? queue[queue.length - 1]!.tick : 0;
    queue.push({ seq, tick: Math.max(earliest, Math.min(tick, latest)), buttons });
  }

  get over(): boolean {
    return this.state.phase === PHASE.over;
  }

  get outcome(): HeadCrashOutcome | null {
    return outcomeOf(this.state);
  }

  /** Runs every step due by `now`. True when a snapshot should go out (every other step, and at once when the round changes). */
  advance(now: number): boolean {
    const { tickMs, snapshotEveryTicks } = HEADCRASH_CONFIG;
    let due = Math.floor((now - this.tickZeroAt) / tickMs);
    // After a long stall, skip the lost time instead of fast-forwarding through it.
    const behind = due - this.state.tick - DUEL_SERVER_CONFIG.maxCatchUpTicks;
    if (behind > 0) {
      this.tickZeroAt += behind * tickMs;
      due -= behind;
    }
    if (this.state.tick >= due || this.over) return false;
    while (this.state.tick < due && !this.over) this.step();
    return this.state.tick - this.sentTick >= snapshotEveryTicks || this.state.phase !== this.sentPhase;
  }

  private step() {
    const next = this.state.tick + 1;
    for (const seat of [0, 1] as const) {
      const queue = this.queues[seat];
      while (queue.length && queue[0]!.tick <= next) {
        const input = queue.shift()!;
        if (input.tick < next) this.late[seat] = (this.late[seat] + 1) & 0xff;
        this.held[seat] = input.buttons;
        this.applied[seat] = input.seq;
      }
    }
    stepHeadCrash(this.state, this.held);
  }

  /** The whole match as it stands, for its players and anyone watching. */
  snapshot(): Bytes {
    this.sentTick = this.state.tick;
    this.sentPhase = this.state.phase;
    const pending: PendingInput[] = [];
    for (const seat of [0, 1] as const) for (const input of this.queues[seat]) pending.push({ seat, tick: input.tick, buttons: input.buttons });
    return encodeSnapshot({ matchId: this.matchId, tickZeroAt: this.tickZeroAt, state: this.state, inputSeq: this.applied, late: this.late, pending });
  }
}
