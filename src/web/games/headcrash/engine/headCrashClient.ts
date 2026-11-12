import { HEADCRASH_CONFIG } from "../../../../shared/games/headcrash/config";
import { layoutFor } from "../../../../shared/games/headcrash/layout";
import type { StepReport } from "../../../../shared/games/headcrash/physics";
import { cloneHeadCrash, countdownNumber, motionOf, scorerOf, stepHeadCrash, waterLevel, waterOf } from "../../../../shared/games/headcrash/simulation";
import { PHASE, type Car, type HeadCrashState, type RoundHit } from "../../../../shared/games/headcrash/types";
import { decodeServerMessage, encodeClientMessage, isNewerSeq, type PendingInput, type Snapshot } from "../../../../shared/games/headcrash/wire";
import type { Seat } from "../../../../shared/games/types";
import type { Bytes } from "../../../../shared/protocol/bytes";
import { ServerClock } from "../../../netcode/serverClock";
import { HEADCRASH_CLIENT_CONFIG } from "../config";
import type { CarView, FrameView, HitView, HudView, MomentView } from "./frame";
import { emptyReport, StepMoments } from "./stepMoments";

const NET = HEADCRASH_CLIENT_CONFIG.net;
const { tickMs, water } = HEADCRASH_CONFIG;

export interface HeadCrashClientOptions {
  matchId: number;
  /** Picks every round's arena (from the tournament's seed and the match). */
  seed: number;
  /** Your seat, or null when you watch. */
  mySeat: Seat | null;
  /** The score as the room has it: until the server's first word, the arena of the round it implies is shown, cars on their starts. */
  score: readonly [number, number];
  /** Server time of the match's step 0 as the room says, and server clock minus `Date.now()`, until the match's own messages refine them. */
  startsAt: number;
  roomClockOffsetMs: number;
  send(data: Bytes): void;
}

interface OwnInput {
  seq: number;
  tick: number;
  buttons: number;
}

interface Pose {
  x: number;
  y: number;
  angle: number;
}

const SEATS = [0, 1] as const;
const noPose = (): Pose => ({ x: 0, y: 0, angle: 0 });
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/** Something for each seat. */
const both = <T>(make: (seat: Seat) => T): [T, T] => [make(0), make(1)];

function copyPose(to: Pose, from: Pose) {
  to.x = from.x;
  to.y = from.y;
  to.angle = from.angle;
}

/**
 * Head Crash's client netcode.
 *
 * A player's phone plays the whole match (both cars: they push each other, so they can't be split) a little
 * ahead of the server, with the same simulation: your buttons act at once and reach the server just in time
 * for the step they were pressed on. The other car is played on with the buttons its player was last known to
 * hold. Thirty times a second the server's word arrives: the match is replayed from it to the present, and any
 * difference from what was on screen is blended out over a few frames, so nothing ever jumps. A hit you see
 * coming freezes the cars at once; the burst, the sound and the point wait for the server's word.
 *
 * A watcher's phone needs no guessing: it draws the match a moment in the past, smoothly between snapshots.
 */
export class HeadCrashClient {
  private readonly clock: ServerClock;
  private tickZeroAt: number;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private pingsSent = 0;

  /** The server's newest word, and the button changes it has still to reach. */
  private server: HeadCrashState | null = null;
  private serverPending: PendingInput[] = [];
  private fresh = false;
  private lastSnapshotAt = -Infinity;
  private lastNudgeAt = -Infinity;
  /** Watching: the last snapshots, to draw between. */
  private snapshots: HeadCrashState[] = [];

  /** The match as played ahead here, and both cars one step before it (frames are drawn between the two). */
  private predicted: HeadCrashState | null = null;
  private readonly before: [Pose, Pose] = [noPose(), noPose()];
  private readonly report: StepReport = emptyReport();
  private readonly stepMoments = new StepMoments();
  /** The newest step whose landings and bumps were reported (replays of older steps stay quiet). */
  private notedTick = -1;
  /** What is still being blended out per car after a correction. */
  private readonly offset: [Pose, Pose] = [noPose(), noPose()];
  private snapNext = true;

  // Buttons.
  private wanted = 0;
  private queued = 0;
  private seq = 0;
  private inputs: OwnInput[] = [];
  private lastLate: number | null = null;
  private lateBoostMs = 0;
  private shownLeadMs: number | null = null;
  private lastFrameAt: number | null = null;
  private ahead = 0;

  // What's on screen.
  private hit: HitView | null = null;
  private hitRound = -1;
  private shownRound = -1;
  private roundShownAt = 0;
  private shownPhase: number = PHASE.countdown;
  private shownCountdown = 0;
  private shownScore = "";
  private held = false;
  private moments: MomentView[] = [];
  private view: HudView = { synced: false, score: [0, 0], countdown: 0, phase: PHASE.countdown, round: 0, waterRising: false };
  /** Bumps when the overlay should refresh at once (a point, a new countdown number). */
  hudVersion = 0;

  /** Netcode numbers for development and test scripts. */
  readonly stats = { corrections: 0, largestCorrection: 0, leadMs: 0, rttMs: 0, replayedTicks: 0, snapshots: 0 };

  constructor(private readonly options: HeadCrashClientOptions) {
    const perfToDate = Date.now() - performance.now();
    this.clock = new ServerClock(perfToDate + options.roomClockOffsetMs, NET);
    this.tickZeroAt = options.startsAt;
  }

  start() {
    if (this.options.mySeat === null) this.send({ kind: "watch", matchId: this.options.matchId });
    this.schedulePing(0);
  }

  stop() {
    if (this.pingTimer !== null) clearTimeout(this.pingTimer);
    this.pingTimer = null;
    if (this.options.mySeat === null) this.send({ kind: "unwatch", matchId: this.options.matchId });
  }

  /** The tab came back (phone unlocked, app switched back): measure the clock again and take the server's word as it is. */
  wake() {
    this.clock.reset();
    this.pingsSent = 0;
    this.snapNext = true;
    if (this.pingTimer !== null) clearTimeout(this.pingTimer);
    this.schedulePing(0);
    if (this.options.mySeat === null) this.send({ kind: "watch", matchId: this.options.matchId });
  }

  /** The room says the match is over (its last point, or someone quit): everything stays where it is. */
  hold() {
    this.held = true;
  }

  /** The buttons you hold now (bits). Sent at once, stamped with the step they act on, here and on the server. */
  setButtons(buttons: number) {
    this.wanted = buttons;
    this.sendButtons(performance.now());
  }

  receive(data: ArrayBuffer) {
    const msg = decodeServerMessage(data);
    if (!msg) return;
    const now = performance.now();
    if (msg.kind === "pong") {
      this.clock.addPong(msg.clientTime, msg.serverTime, now);
      this.stats.rttMs = this.clock.rttMs;
      return;
    }
    if (msg.matchId !== this.options.matchId) return;
    const state: HeadCrashState = { ...msg.state, seed: this.options.seed };
    const startedOver = !this.server || state.tick + NET.restartTicks < this.server.tick;
    if (startedOver) {
      // Rounds are counted afresh after a restart: a hit shown for the same number before is another round's.
      this.hitRound = -1;
      this.hit = null;
      this.shownRound = -1;
    }
    this.server = state;
    this.serverPending = msg.pending;
    this.tickZeroAt = msg.tickZeroAt;
    this.fresh = true;
    this.lastSnapshotAt = now;
    this.stats.snapshots += 1;
    const seat = this.options.mySeat;
    if (seat === null) {
      if (startedOver) this.snapshots = [];
      this.snapshots.push(state);
      if (this.snapshots.length > NET.snapshotsKept) this.snapshots.shift();
      return;
    }
    this.adoptInputs(msg, seat, startedOver);
    // The server's word on a hit shows at once (the cars are already there: this phone plays ahead).
    if (state.hit) this.showHit(state.round, state.hit, now);
  }

  /** Builds the frame to draw at `now` (performance.now). */
  frame(now: number): FrameView {
    const elapsed = this.lastFrameAt === null ? 0 : Math.min(250, now - this.lastFrameAt);
    this.lastFrameAt = now;
    this.nudge(now);
    if (!this.server) return this.restFrame(now);
    this.lateBoostMs = Math.max(0, this.lateBoostMs - (NET.lateBoostDecayPerS * elapsed) / 1000);
    const serverTick = (this.clock.serverNow(now) - this.tickZeroAt) / tickMs;
    return this.options.mySeat === null ? this.watchFrame(serverTick, elapsed, now) : this.playFrame(serverTick, elapsed, now);
  }

  /** What just happened, since the last time this was asked. */
  takeMoments(): MomentView[] {
    const taken = this.moments;
    this.moments = [];
    return taken;
  }

  hud(): HudView {
    return this.view;
  }

  // --- Playing: the match played ahead ---

  private playFrame(serverTick: number, elapsed: number, now: number): FrameView {
    const server = this.server!;
    const neededLead = this.clock.rttMs / 2 + 2 * this.clock.jitterMs + NET.leadSafetyMs + this.lateBoostMs;
    // In the countdown the cars stand still, so the lead takes its new value at once (the 3, 2, 1 keeps its pace).
    const leadMs = this.easeLead(neededLead, elapsed, this.predicted?.phase === PHASE.countdown);
    this.stats.leadMs = leadMs;
    // Never behind the server's word, never far past it (the cars wait there through a stall).
    const ahead = this.held ? this.ahead : Math.min(Math.max(serverTick + leadMs / tickMs, server.tick), server.tick + NET.maxPredictTicks);
    this.ahead = ahead;
    const target = Math.floor(ahead) + 1;
    this.sendButtons(now);

    if (!this.predicted || (this.fresh && !this.held)) {
      // Where the cars would have been drawn without the server's new word...
      let drawn: [Pose, Pose] | null = null;
      let drawnRound = -1;
      if (this.predicted && !this.snapNext) {
        this.advance(target, now, false);
        drawn = [this.rawPose(0, ahead), this.rawPose(1, ahead)];
        drawnRound = this.predicted.round;
      }
      // ...and where they are with it: the match replayed from the server's step to the present.
      this.predicted = cloneHeadCrash(server);
      for (const seat of SEATS) copyPose(this.before[seat], server.cars[seat]);
      this.stats.replayedTicks = Math.max(0, target - server.tick);
      this.advance(target, now, true);
      for (const seat of SEATS) this.correct(seat, drawn && drawnRound === this.predicted.round ? drawn[seat] : null, ahead);
      this.fresh = false;
      this.snapNext = false;
    } else if (!this.held) this.advance(target, now, true);

    const fade = Math.pow(0.5, elapsed / NET.correctionHalfLifeMs);
    const cars = both<CarView>((seat) => {
      const offset = this.offset[seat];
      offset.x *= fade;
      offset.y *= fade;
      offset.angle *= fade;
      const pose = this.rawPose(seat, ahead);
      const car = this.predicted!.cars[seat];
      return {
        x: pose.x + offset.x,
        y: pose.y + offset.y,
        angle: pose.angle + offset.angle,
        vx: car.vx,
        vy: car.vy,
        grounded: this.stepMoments.grounded[seat],
        buttons: this.predicted!.buttons[seat],
      };
    });
    return this.present(this.predicted, cars, server.score, now);
  }

  /** Plays the match on to `target`, a step at a time, with the buttons known for each step. */
  private advance(target: number, now: number, note: boolean) {
    const state = this.predicted!;
    for (let guard = NET.maxPredictTicks + 2; state.tick < target && state.phase !== PHASE.over && guard > 0; guard--) {
      const round = state.round;
      const playing = state.phase === PHASE.play;
      for (const seat of SEATS) copyPose(this.before[seat], state.cars[seat]);
      const tick = state.tick + 1;
      stepHeadCrash(state, [this.buttonsAt(0, tick, state.buttons[0]), this.buttonsAt(1, tick, state.buttons[1])], this.report);
      // A new round puts the cars back on their starts: nothing to draw in between.
      if (state.round !== round) for (const seat of SEATS) copyPose(this.before[seat], state.cars[seat]);
      if (note && tick > this.notedTick) {
        this.notedTick = tick;
        if (playing) this.stepMoments.note(this.report, now, this.moments);
        else this.stepMoments.rest();
      }
    }
  }

  /** What `seat` holds on step `tick`: its last known change by then, else what it held before. */
  private buttonsAt(seat: Seat, tick: number, held: number): number {
    let buttons = held;
    if (seat === this.options.mySeat) {
      for (const input of this.inputs) if (input.tick <= tick) buttons = input.buttons;
    } else {
      for (const input of this.serverPending) if (input.seat === seat && input.tick <= tick) buttons = input.buttons;
    }
    return buttons;
  }

  /** A car between the last two steps played, without its correction. */
  private rawPose(seat: Seat, ahead: number): Pose {
    const state = this.predicted!;
    const car = state.cars[seat];
    const from = this.before[seat];
    const part = state.phase === PHASE.over ? 1 : clamp01(ahead - (state.tick - 1));
    return { x: lerp(from.x, car.x, part), y: lerp(from.y, car.y, part), angle: lerp(from.angle, car.angle, part) };
  }

  /** The server's word moved a car: keep drawing it where it was, and let the difference blend out. */
  private correct(seat: Seat, drawn: Pose | null, ahead: number) {
    const offset = this.offset[seat];
    if (!drawn) {
      copyPose(offset, noPose());
      return;
    }
    const now = this.rawPose(seat, ahead);
    const dx = drawn.x - now.x;
    const dy = drawn.y - now.y;
    const moved = Math.hypot(dx, dy);
    if (moved > NET.correctionNoise) {
      this.stats.corrections += 1;
      this.stats.largestCorrection = Math.max(this.stats.largestCorrection, moved);
    }
    offset.x += dx;
    offset.y += dy;
    offset.angle += drawn.angle - now.angle;
    if (Math.hypot(offset.x, offset.y) > NET.correctionSnap || Math.abs(offset.angle) > NET.correctionSnapAngle) copyPose(offset, noPose());
  }

  /**
   * Moving the lead at once would move the cars along their paths in one frame, so it eases there instead:
   * the match runs a few percent faster or slower for a moment. A big change (a stall) snaps, and so does any
   * change while nothing moves (`still`).
   */
  private easeLead(needed: number, elapsed: number, still = false): number {
    const diff = needed - (this.shownLeadMs ?? needed);
    if (this.shownLeadMs === null || still || Math.abs(diff) > NET.leadSnapMs) this.shownLeadMs = needed;
    else this.shownLeadMs += Math.max(-elapsed * NET.leadSlewRate, Math.min(elapsed * NET.leadSlewRate, diff));
    return this.shownLeadMs;
  }

  // --- Buttons ---

  /** Keeps only the button changes the server has still to play; after it started the match over, starts numbering from its count. */
  private adoptInputs(msg: Snapshot, seat: Seat, startedOver: boolean) {
    const applied = msg.inputSeq[seat];
    const waiting = msg.pending.filter((input) => input.seat === seat);
    if (startedOver) {
      this.inputs = [];
      this.seq = (applied + waiting.length) & 0xffff;
      this.queued = waiting.length ? waiting[waiting.length - 1]!.buttons : msg.state.buttons[seat];
      this.notedTick = msg.state.tick;
      this.snapNext = true;
      this.lastLate = msg.late[seat];
      return;
    }
    this.inputs = this.inputs.filter((input) => isNewerSeq(input.seq, applied));
    if (this.lastLate !== null && msg.late[seat] !== this.lastLate) {
      this.lateBoostMs = Math.min(NET.lateBoostMaxMs, this.lateBoostMs + NET.lateBoostStepMs);
    }
    this.lastLate = msg.late[seat];
  }

  private sendButtons(now: number) {
    if (this.options.mySeat === null || !this.server || !this.predicted || this.held || this.wanted === this.queued) return;
    if (this.server.phase === PHASE.over) return;
    // The step after the newest one on screen: the change shows on the very next step, and the server gets it in time.
    const serverTick = (this.clock.serverNow(now) - this.tickZeroAt) / tickMs;
    const ahead = serverTick + (this.shownLeadMs ?? 0) / tickMs;
    const tick = Math.max(this.predicted.tick, Math.floor(ahead) + 1) + 1;
    this.queued = this.wanted;
    this.seq = (this.seq + 1) & 0xffff;
    this.inputs.push({ seq: this.seq, tick, buttons: this.wanted });
    this.send({ kind: "input", matchId: this.options.matchId, seq: this.seq, tick, buttons: this.wanted });
  }

  // --- Watching: the match a moment in the past ---

  private watchFrame(serverTick: number, elapsed: number, now: number): FrameView {
    const delayMs = this.easeLead(-(NET.watchDelayMs + 2 * this.clock.jitterMs), elapsed);
    this.stats.leadMs = delayMs;
    const at = serverTick + delayMs / tickMs;
    const snapshots = this.snapshots;
    let index = snapshots.length - 1;
    while (index > 0 && snapshots[index]!.tick > at) index--;
    if (index > 1) {
      snapshots.splice(0, index - 1);
      index = 1;
    }
    const from = snapshots[index]!;
    const to = snapshots[index + 1];
    const part = to && to.round === from.round && to.tick > from.tick ? clamp01((at - from.tick) / (to.tick - from.tick)) : 0;
    const cars = both<CarView>((seat) => {
      const a = from.cars[seat];
      const b: Car = to && part > 0 ? to.cars[seat] : a;
      return {
        x: lerp(a.x, b.x, part),
        y: lerp(a.y, b.y, part),
        angle: lerp(a.angle, b.angle, part),
        vx: a.vx,
        vy: a.vy,
        // No word on the wheels here: a car rolling along is taken to be on the ground.
        grounded: Math.abs(a.spin) < 1,
        buttons: from.buttons[seat],
      };
    });
    if (from.hit) this.showHit(from.round, from.hit, now);
    return this.present(from, cars, from.score, now);
  }

  // --- What's on screen ---

  /** Before the server's first word (or for a match that is already over): the arena, with the cars on their starts. */
  private restFrame(now: number): FrameView {
    const round = this.options.score[0] + this.options.score[1];
    const layout = layoutFor(this.options.seed, round);
    const cars = both<CarView>((seat) => ({ ...layout.spawns[seat], grounded: true, buttons: 0 }));
    return { layout, round, phase: PHASE.countdown, cars, waterY: waterLevel(layout, 0), motion: { playTicks: 0 }, waterRising: false, hit: null, roundShownAt: now };
  }

  private showHit(round: number, hit: RoundHit, now: number) {
    if (this.hitRound === round) return;
    this.hitRound = round;
    this.hit = { ...hit, round, shownAt: now };
    this.moments.push({ kind: "hit", hit, scorer: scorerOf(hit.victims), at: now });
  }

  /** The frame, and what the overlay shows with it. */
  private present(state: HeadCrashState, cars: [CarView, CarView], score: readonly [number, number], now: number): FrameView {
    if (state.round !== this.shownRound) {
      this.shownRound = state.round;
      this.roundShownAt = now;
    }
    // The last round's hit stays until the next round is on screen.
    if (this.hit && this.hit.round < state.round) this.hit = null;
    // GO only after a countdown this phone showed: joining a round already being played (a reload, a late watcher) has none.
    if (this.view.synced && this.shownPhase === PHASE.countdown && state.phase === PHASE.play) this.moments.push({ kind: "go", at: now });
    const countdown = countdownNumber(state);
    const waterRising = state.phase === PHASE.play && state.phaseTicks > water.startTicks;
    const scoreKey = `${score[0]}:${score[1]}`;
    if (countdown !== this.shownCountdown || state.phase !== this.shownPhase || scoreKey !== this.shownScore || waterRising !== this.view.waterRising || !this.view.synced) {
      this.hudVersion += 1;
      this.view = { synced: true, score: [score[0], score[1]], countdown, phase: state.phase, round: state.round, waterRising };
    }
    this.shownPhase = state.phase;
    this.shownCountdown = countdown;
    this.shownScore = scoreKey;
    return {
      layout: layoutFor(this.options.seed, state.round),
      round: state.round,
      phase: state.phase,
      cars,
      waterY: waterOf(state),
      motion: motionOf(state),
      waterRising,
      hit: this.hit,
      roundShownAt: this.roundShownAt,
    };
  }

  // --- The connection ---

  /** Nothing from the server for a while, though the match should be live: say something it must look the match up for. */
  private nudge(now: number) {
    if (this.held || this.server?.phase === PHASE.over) return;
    if (now - Math.max(this.lastSnapshotAt, this.lastNudgeAt) < NET.silenceNudgeMs) return;
    if (this.lastNudgeAt === -Infinity && this.lastSnapshotAt === -Infinity) {
      // Just opened: give the first snapshot its time.
      this.lastNudgeAt = now;
      return;
    }
    this.lastNudgeAt = now;
    const { matchId, mySeat } = this.options;
    if (mySeat === null) this.send({ kind: "watch", matchId });
    else {
      this.seq = (this.seq + 1) & 0xffff;
      this.send({ kind: "input", matchId, seq: this.seq, tick: 0, buttons: this.queued });
    }
  }

  private schedulePing(delayMs: number) {
    this.pingTimer = setTimeout(() => {
      this.send({ kind: "ping", clientTime: performance.now() });
      this.pingsSent += 1;
      this.schedulePing(this.pingsSent < NET.firstPings ? NET.firstPingIntervalMs : NET.pingIntervalMs);
    }, delayMs);
  }

  private send(message: Parameters<typeof encodeClientMessage>[0]) {
    this.options.send(encodeClientMessage(message));
  }
}
