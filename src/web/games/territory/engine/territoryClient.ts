import { difference, FillRule } from "clipper2-ts";
import { headLimit } from "../../../../shared/games/territory/arena";
import { captureLand, type ArenaShape } from "../../../../shared/games/territory/capture";
import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import { landArea } from "../../../../shared/games/territory/geometry";
import { angleToRadians } from "../../../../shared/games/territory/movement";
import { landShare } from "../../../../shared/games/territory/ranking";
import { arenaShape } from "../../../../shared/games/territory/simulation";
import type { Land, Point } from "../../../../shared/games/territory/types";
import { decodeServerMessage, encodeClientMessage, type TerritoryClientMessage } from "../../../../shared/games/territory/wire";
import type { Bytes } from "../../../../shared/protocol/bytes";
import type { PlayerId } from "../../../../shared/rooms/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { EffectView, EndingView, FrameView, HeadView, HudView, KnockoutView, MomentView, PlayerFrame } from "./frame";
import { OwnPredictor, type Prediction } from "./prediction";
import { landAt, latestLand, Replica, type ReplicaPlayer } from "./replica";
import { ServerClock } from "./serverClock";

const NET = TERRITORY_CLIENT_CONFIG.net;
const LOOK = TERRITORY_CLIENT_CONFIG.look;
const { tickMs, angleSteps, speedPerStep } = TERRITORY_CONFIG;

export interface TerritoryClientOptions {
  myId: PlayerId;
  /** Whether you play in this match (false: you watch). */
  playing: boolean;
  radius: number;
  /** Server time play starts, and server clock minus `Date.now()` (from the room), until pings refine it. */
  startsAt: number;
  roomClockOffsetMs: number;
  send(data: Bytes): void;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

function lerpAngle(a: number, b: number, f: number): number {
  const half = angleSteps / 2;
  const diff = ((((b - a + half) % angleSteps) + angleSteps) % angleSteps) - half;
  return a + diff * f;
}

/**
 * Territory's client netcode. You see yourself ahead of the server (predicted from your own steering,
 * so your head answers your thumb at once) and everyone else a little in the past (smoothly between
 * snapshots). Each frame is rebuilt from the server's latest state, so corrections and resyncs need no
 * special paths. Only the server decides captures and knockouts; your own capture is shown the moment
 * your head gets home and is replaced by the server's identical one a few steps later.
 */
export class TerritoryClient {
  readonly replica = new Replica();
  private readonly clock: ServerClock;
  private readonly predictor = new OwnPredictor();
  private readonly shape: ArenaShape;
  private readonly arenaArea: number;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private pingsSent = 0;
  private pingSentAt = new Map<number, number>();
  private awaitingSync = false;
  /** The match is over: nothing moves past the server's last step. */
  private finished = false;
  private ending: EndingView | null = null;
  private knockouts: KnockoutView[] = [];
  /** Bumps when the overlay should refresh at once (a knockout), not at its usual pace. */
  hudVersion = 0;

  // Netcode state.
  private lateness: number[] = [];
  private interpMs: number = NET.minInterpMs;
  private lateBoostMs = 0;
  private lastLate: number | null = null;
  private lastFrameAt: number | null = null;

  // Steering.
  private wantedTarget: number | null = null;
  private sentTarget: number | null = null;
  private lastSendAt = -Infinity;

  // Own head smoothing and predicted capture.
  private correction = { x: 0, y: 0 };
  private lastSteps = new Map<number, Point>();
  private predictedCapture: { key: string; land: Land } | null = null;
  private flashedCaptureKey: string | null = null;
  /** The step others are drawn at (last frame). */
  private pastTick = 0;

  /** Netcode numbers for development and test scripts. */
  readonly stats = { corrections: 0, largestCorrection: 0, resyncs: 0, interpMs: 0, leadMs: 0 };

  private effects: EffectView[] = [];
  private moments: MomentView[] = [];
  private shownEvents = new Set<string>();
  private areaCache = new WeakMap<Land, number>();
  private lastDrawnHeads = new Map<PlayerId, HeadView>();

  constructor(private readonly options: TerritoryClientOptions) {
    const perfToDate = Date.now() - performance.now();
    this.clock = new ServerClock(perfToDate + options.roomClockOffsetMs, options.startsAt);
    this.shape = arenaShape(options.radius);
    this.arenaArea = landArea(this.shape.arena);
  }

  start() {
    this.requestSync();
    this.schedulePing(0);
  }

  stop() {
    if (this.pingTimer !== null) clearTimeout(this.pingTimer);
    this.pingTimer = null;
  }

  /** The tab came back (phone unlocked, app switched back): resync everything and re-measure the clock. */
  wake() {
    this.requestSync();
    this.pingsSent = 0;
    this.stop();
    this.schedulePing(0);
  }

  /** The match ended: everyone stops where the server's last step left them, and the ending plays. */
  finish(winners: readonly PlayerId[]) {
    this.finished = true;
    if (this.ending) return;
    const now = performance.now();
    this.ending = { winners: [...winners], startedAt: now };
    // The winners' land flashes as everything else washes out.
    for (const id of winners) {
      const p = this.replica.players.get(id);
      if (p) this.flash(this.displayedLand(p), now + LOOK.washAtMs);
    }
  }

  /** Steering direction in angle steps, or null to keep the current one (finger lifted). */
  steer(target: number | null) {
    if (target === null) return;
    const q = TERRITORY_CLIENT_CONFIG.net.targetQuantum;
    this.wantedTarget = (Math.round(target / q) * q) % angleSteps;
  }

  receive(data: ArrayBuffer) {
    const msg = decodeServerMessage(data);
    if (!msg) return;
    const now = performance.now();
    if (msg.kind === "pong") {
      const sentAt = this.pingSentAt.get(msg.clientTime);
      this.pingSentAt.delete(msg.clientTime);
      if (sentAt !== undefined) this.clock.addPong(sentAt, msg.serverTime, now, msg.tickZeroAt);
      return;
    }
    if (msg.kind === "full") {
      this.replica.applyFull(msg);
      this.awaitingSync = false;
      const me = this.replica.players.get(this.options.myId);
      if (me?.head) this.predictor.adoptServerSeq(me.head.inputSeq);
      this.sentTarget = me?.head?.target ?? null;
      this.lastLate = me?.head?.late ?? null;
      this.lastSteps.clear();
      this.correction = { x: 0, y: 0 };
      // Effects already over on the server are not replayed.
      for (const p of this.replica.players.values()) if (!p.alive) this.shownEvents.add(`out:${p.id}`);
      return;
    }
    if (this.awaitingSync) return;
    if (!this.replica.applySnapshot(msg)) {
      this.requestSync();
      return;
    }
    // How late this step arrived, by the server clock: sizes how far in the past others are drawn.
    const late = this.clock.serverNow(now) - this.clock.timeOfTick(msg.tick);
    this.lateness.push(late);
    if (this.lateness.length > NET.lateWindow) this.lateness.shift();
    const mine = msg.heads.find((h) => h.id === this.options.myId);
    if (mine) {
      if (this.lastLate !== null && mine.late !== this.lastLate) {
        this.lateBoostMs = Math.min(NET.lateBoostMaxMs, this.lateBoostMs + NET.lateBoostStepMs);
      }
      this.lastLate = mine.late;
    }
    // Your own events and the ones you caused show at once; the rest when their step is drawn.
    for (const e of msg.events) {
      if (e.id === this.options.myId || (e.type === "out" && e.by === this.options.myId)) this.showEvent(msg.tick, e.id, e.type, now);
    }
  }

  /** Builds the frame to draw at `now` (performance.now), and sends steering when it changed. */
  frame(now: number): FrameView | null {
    const r = this.replica;
    if (!r.synced) return null;
    const elapsed = this.lastFrameAt === null ? 0 : Math.min(250, now - this.lastFrameAt);
    this.lastFrameAt = now;
    this.lateBoostMs = Math.max(0, this.lateBoostMs - (NET.lateBoostDecayPerS * elapsed) / 1000);

    const serverNow = this.clock.serverNow(now);
    const serverTick = this.clock.tickAt(serverNow);
    const neededInterp = Math.max(NET.minInterpMs, Math.max(0, ...this.lateness) + tickMs);
    this.interpMs = neededInterp > this.interpMs ? neededInterp : Math.max(neededInterp, this.interpMs - (NET.interpShrinkPerS * elapsed) / 1000);
    const pastTick = Math.min(serverTick - this.interpMs / tickMs, r.tick + (this.finished ? 0 : NET.maxExtrapolateTicks));
    const leadMs = this.clock.rttMs / 2 + 2 * this.clock.jitterMs + NET.leadSafetyMs + this.lateBoostMs;
    const aheadTick = this.finished ? r.tick : Math.max(r.tick, serverTick + leadMs / tickMs);

    this.stats.interpMs = this.interpMs;
    this.stats.leadMs = leadMs;
    this.sendSteering(now, aheadTick);
    this.playDueEvents(pastTick, now);
    this.pastTick = pastTick;
    r.trim(Math.floor(pastTick) - 1);

    const me = r.players.get(this.options.myId);
    const prediction = me?.alive && this.options.playing ? this.predict(me, aheadTick, elapsed) : null;

    const players: PlayerFrame[] = [];
    for (const p of r.players.values()) {
      if (p.id === this.options.myId && prediction) continue;
      players.push(this.othersFrame(p, pastTick));
    }
    let focus: Point | null = null;
    if (me && prediction) {
      const others = players.flatMap((p) => (p.head ? [p.head] : []));
      const frame = this.ownFrame(me, prediction, aheadTick, pastTick, now, others);
      players.push(frame);
      focus = frame.head;
    }
    this.effects = this.effects.filter((e) => now - e.startedAt < Math.max(LOOK.captureFlashMs, LOOK.burstMs, LOOK.vanishMs, LOOK.shakeMs));
    this.knockouts = this.knockouts.filter((k) => now - k.at < TERRITORY_CLIENT_CONFIG.hud.knockoutShowMs);
    // The ending shows the whole arena.
    return { radius: r.radius, players, effects: this.effects, focus: this.ending ? null : focus, ending: this.ending };
  }

  /** What just happened, since the last time this was asked. */
  takeMoments(): MomentView[] {
    const taken = this.moments;
    this.moments = [];
    return taken;
  }

  hud(now: number): HudView {
    const r = this.replica;
    const serverNow = this.clock.serverNow(now);
    const me = r.players.get(this.options.myId);
    const shares = [...r.players.values()]
      .filter((p) => p.alive)
      .map((p) => ({ id: p.id, share: landShare(this.area(this.displayedLand(p)), this.arenaArea) }))
      .sort((a, b) => b.share - a.share || a.id - b.id);
    const out = [...r.players.values()].filter((p) => !p.alive).sort((a, b) => (a.outTick ?? 0) - (b.outTick ?? 0)).map((p) => p.id);
    return {
      synced: r.synced,
      countdownMs: Math.max(0, this.clock.tickZeroAt - serverNow),
      timeLeftMs: Math.max(0, this.clock.tickZeroAt + TERRITORY_CONFIG.matchMs - serverNow),
      shares,
      out,
      meAlive: !!me?.alive,
      myOutReason: me && !me.alive ? me.outReason : null,
      myCutter: me && !me.alive ? me.cutBy : null,
      knockouts: this.knockouts.filter((k) => now - k.at < TERRITORY_CLIENT_CONFIG.hud.knockoutShowMs),
    };
  }

  // --- Steering ---

  private sendSteering(now: number, aheadTick: number) {
    const me = this.replica.players.get(this.options.myId);
    if (!this.options.playing || !me?.alive || this.wantedTarget === null || this.wantedTarget === this.sentTarget) return;
    if (now - this.lastSendAt < tickMs) return;
    // Stamped for the next step you are about to see, so the server applies it exactly where you did.
    const tick = Math.max(1, Math.floor(aheadTick) + 1);
    const input = this.predictor.nextInput(tick, this.wantedTarget);
    this.send({ kind: "input", seq: input.seq, tick: input.tick, target: input.target });
    this.sentTarget = this.wantedTarget;
    this.lastSendAt = now;
  }

  // --- Your own head ---

  private predict(me: ReplicaPlayer, aheadTick: number, elapsed: number): Prediction | null {
    const upTo = Math.floor(aheadTick) + 1;
    const prediction = this.predictor.predict(me, this.replica.tick, upTo, headLimit(this.replica.radius), [...this.replica.players.values()]);
    if (!prediction) return null;
    // A changed answer for a step already shown becomes a short glide, not a jump.
    const shownTick = Math.floor(aheadTick);
    const before = this.lastSteps.get(shownTick);
    const after = prediction.steps.find((s) => s.tick === shownTick);
    if (before && after) {
      const dx = before.x - after.x;
      const dy = before.y - after.y;
      const size = Math.hypot(dx, dy);
      if (size > 0) {
        this.stats.corrections += 1;
        this.stats.largestCorrection = Math.max(this.stats.largestCorrection, size);
      }
      if (size > NET.correctionSnapUnits) this.correction = { x: 0, y: 0 };
      else this.correction = { x: this.correction.x + dx, y: this.correction.y + dy };
    }
    const decay = Math.pow(0.5, elapsed / NET.correctionHalfLifeMs);
    this.correction = { x: this.correction.x * decay, y: this.correction.y * decay };
    this.lastSteps = new Map(prediction.steps.map((s) => [s.tick, { x: s.x, y: s.y }]));
    return prediction;
  }

  private ownFrame(me: ReplicaPlayer, prediction: Prediction, aheadTick: number, pastTick: number, now: number, others: readonly HeadView[]): PlayerFrame {
    const steps = prediction.steps;
    const a = steps.find((s) => s.tick === Math.floor(aheadTick)) ?? steps[steps.length - 1]!;
    const b = steps.find((s) => s.tick === a.tick + 1) ?? a;
    const f = aheadTick - Math.floor(aheadTick);
    const head: HeadView = {
      x: lerp(a.x, b.x, f) + this.correction.x,
      y: lerp(a.y, b.y, f) + this.correction.y,
      angle: angleToRadians(lerpAngle(a.heading, b.heading, f)),
    };
    keepClear(head, others);
    this.lastDrawnHeads.set(me.id, head);

    // Trail: up to the shown step, then to the head. Gone once the predicted homecoming is reached.
    const shownTick = Math.floor(aheadTick);
    const captured = prediction.capture && prediction.capture.tick <= shownTick ? prediction.capture : null;
    let trail: Point[] | null = null;
    if (!captured && prediction.trail) {
      const laidAfter = steps.filter((s) => s.tick > shownTick).length;
      trail = [...prediction.trail.slice(0, Math.max(1, prediction.trail.length - laidAfter)), head];
    }

    const latest = latestLand(me).land;
    let home = latest;
    if (captured) {
      const key = `${this.replica.generation}:${captured.tick}:${captured.trail.length}:${captured.trail[captured.trail.length - 1]!.x}`;
      if (this.predictedCapture?.key !== key) this.predictedCapture = { key, land: captureLand(latest, captured.trail, this.shape) };
      home = this.predictedCapture.land;
      if (this.flashedCaptureKey !== key) {
        this.flashedCaptureKey = key;
        const gained = difference(home, latest, FillRule.NonZero);
        this.flash(gained, now);
        this.noteCapture(gained, now);
      }
    } else {
      this.predictedCapture = null;
    }
    // Land you just lost to someone stays until their capture is drawn (they are shown a little in the past).
    return { id: me.id, isMe: true, head, trail, land: [landAt(me, pastTick).land, home], home };
  }

  // --- Everyone else, drawn a little in the past ---

  private headAt(p: ReplicaPlayer, tick: number): HeadView | null {
    if (p.outTick !== null && p.outTick <= tick) return null;
    const a = Math.floor(tick);
    const f = tick - a;
    const ha = p.history.get(a);
    const hb = p.history.get(a + 1);
    if (ha && hb) {
      return { x: lerp(ha.x, hb.x, f), y: lerp(ha.y, hb.y, f), angle: angleToRadians(lerpAngle(ha.heading, hb.heading, f)) };
    }
    // Ahead of the snapshots (a hiccup): keep going straight a little; before them: the oldest known.
    const known = [...p.history.keys()];
    if (!known.length) return null;
    const newest = Math.max(...known);
    if (tick >= newest) {
      const h = p.history.get(newest)!;
      const ahead = Math.min(tick - newest, NET.maxExtrapolateTicks);
      const angle = angleToRadians(h.heading);
      return { x: h.x + Math.cos(angle) * speedPerStep * ahead, y: h.y + Math.sin(angle) * speedPerStep * ahead, angle };
    }
    const h = p.history.get(Math.min(...known))!;
    return { x: h.x, y: h.y, angle: angleToRadians(h.heading) };
  }

  private othersFrame(p: ReplicaPlayer, tick: number): PlayerFrame {
    const head = this.headAt(p, tick);
    if (head) this.lastDrawnHeads.set(p.id, head);
    let trail: Point[] | null = null;
    for (const record of p.trails) {
      if (record.startTick - 1 >= tick || (record.endTick !== null && record.endTick <= tick)) continue;
      const laid = record.points.filter((pt, i) => i === 0 || pt.tick <= tick).map(({ x, y }) => ({ x, y }));
      trail = head ? [...laid, { x: head.x, y: head.y }] : laid;
    }
    const land = landAt(p, tick).land;
    return { id: p.id, isMe: p.id === this.options.myId, head, trail, land: [land], home: land };
  }

  /** Plays others' captures and knockouts when their step is drawn. */
  private playDueEvents(tick: number, now: number) {
    const pending = this.replica.pending;
    while (pending.length && pending[0]!.tick <= tick) {
      const { tick: at, event } = pending.shift()!;
      this.showEvent(at, event.id, event.type, now);
    }
  }

  private showEvent(tick: number, id: PlayerId, type: "trailStart" | "capture" | "out", now: number) {
    if (type === "trailStart") return;
    const key = type === "out" ? `out:${id}` : `capture:${id}:${tick}`;
    if (this.shownEvents.has(key)) return;
    this.shownEvents.add(key);
    const p = this.replica.players.get(id);
    if (!p) return;
    if (type === "out") {
      const at = this.lastDrawnHeads.get(id);
      if (at) this.effects.push({ kind: "burst", id, x: at.x, y: at.y, startedAt: now });
      this.moments.push({ kind: "out", id, by: p.cutBy, reason: p.outReason, x: at?.x ?? 0, y: at?.y ?? 0, at: now });
      if (p.outReason) {
        this.knockouts.push({ id, by: p.cutBy, reason: p.outReason, at: now });
        this.hudVersion += 1;
      }
      const mine = this.options.myId;
      if (this.options.playing && (id === mine || p.cutBy === mine)) this.effects.push({ kind: "shake", strength: id === mine ? "hard" : "light", startedAt: now });
      // Land passing to the cutter flashes too.
      const heir = p.cutBy !== null ? this.replica.players.get(p.cutBy) : undefined;
      const after = heir?.lands.find((v) => v.tick === tick);
      const before = heir ? landAt(heir, tick - 1) : undefined;
      if (after && before) this.flash(difference(after.land, before.land, FillRule.NonZero), now);
      return;
    }
    this.fadeCutOffLand(tick, id, now);
    // Your own capture already flashed when your head got home (predicted).
    if (id === this.options.myId && this.flashedCaptureKey !== null) return;
    const after = p.lands.find((v) => v.tick === tick);
    if (!after) return;
    const gained = difference(after.land, landAt(p, tick - 1).land, FillRule.NonZero);
    this.flash(gained, now);
    if (id === this.options.myId) this.noteCapture(gained, now);
  }

  private noteCapture(gained: Land, now: number) {
    if (gained.length) this.moments.push({ kind: "capture", area: landArea(gained), at: now });
  }

  /**
   * Land that someone's capture cut off from its owner vanishes: it fades away when that step is drawn
   * (your own captures show early, so their fade waits for the others' land to catch up).
   */
  private fadeCutOffLand(tick: number, capturerId: PlayerId, now: number) {
    const capturer = this.replica.players.get(capturerId);
    const taken = capturer?.lands.find((v) => v.tick === tick)?.land;
    if (!taken) return;
    const startsAt = now + Math.max(0, (tick - this.pastTick) * tickMs);
    for (const p of this.replica.players.values()) {
      if (p.id === capturerId) continue;
      const after = p.lands.find((v) => v.tick === tick);
      if (!after) continue;
      const lost = difference(landAt(p, tick - 1).land, after.land, FillRule.NonZero);
      const vanished = lost.length ? difference(lost, taken, FillRule.NonZero) : [];
      if (vanished.length) this.effects.push({ kind: "vanish", id: p.id, land: vanished, startedAt: startsAt });
    }
  }

  private flash(land: Land, now: number) {
    if (land.length) this.effects.push({ kind: "flash", land, startedAt: now });
  }

  // --- Helpers ---

  private displayedLand(p: ReplicaPlayer): Land {
    if (p.id === this.options.myId && this.predictedCapture) return this.predictedCapture.land;
    return latestLand(p).land;
  }

  private area(land: Land): number {
    let area = this.areaCache.get(land);
    if (area === undefined) {
      area = landArea(land);
      this.areaCache.set(land, area);
    }
    return area;
  }

  private requestSync() {
    this.stats.resyncs += 1;
    this.awaitingSync = true;
    this.send({ kind: "sync" });
  }

  private schedulePing(delay: number) {
    this.pingTimer = setTimeout(() => {
      const sentAt = performance.now();
      // The echoed value is our own send time: unique per ping and enough to match the pong.
      this.pingSentAt.set(sentAt, sentAt);
      if (this.pingSentAt.size > NET.clockSamples) this.pingSentAt.delete(this.pingSentAt.keys().next().value!);
      this.send({ kind: "ping", clientTime: sentAt });
      this.pingsSent += 1;
      this.schedulePing(this.pingsSent < NET.firstPings ? NET.firstPingIntervalMs : NET.pingIntervalMs);
    }, delay);
  }

  private send(message: TerritoryClientMessage) {
    this.options.send(encodeClientMessage(message));
  }
}

/**
 * Your head is drawn ahead of the server and everyone else a little behind it, so even when the
 * prediction is right the two can overlap on screen for a moment (someone crossing in front of you).
 * Drawn heads are solid too: yours is pushed out of theirs, only on screen.
 */
function keepClear(head: HeadView, others: readonly HeadView[]) {
  const minGap = TERRITORY_CONFIG.headRadius * 2;
  for (const other of others) {
    const dx = head.x - other.x;
    const dy = head.y - other.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= minGap) continue;
    const nx = dist === 0 ? Math.cos(head.angle + Math.PI) : dx / dist;
    const ny = dist === 0 ? Math.sin(head.angle + Math.PI) : dy / dist;
    head.x = other.x + nx * minGap;
    head.y = other.y + ny * minGap;
  }
}
