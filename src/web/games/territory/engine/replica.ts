import type { Land, OutReason, Point, TerritoryEvent } from "../../../../shared/games/territory/types";
import type { FullSync, HeadFrame, Snapshot } from "../../../../shared/games/territory/wire";
import type { PlayerId } from "../../../../shared/rooms/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";

/** A trail point and the step it was laid on. */
export interface TickPoint extends Point {
  tick: number;
}

/** One trip out of home: from the exit point to the head, or (once ended) to where it came home or was cut. */
export interface TrailRecord {
  startTick: number;
  /** Step it ended on (capture or out); null while it is still growing. */
  endTick: number | null;
  points: TickPoint[];
}

/** A player's land from step `tick` on. */
export interface LandVersion {
  tick: number;
  land: Land;
}

export interface ReplicaPlayer {
  id: PlayerId;
  alive: boolean;
  outTick: number | null;
  outReason: OutReason | null;
  cutBy: PlayerId | null;
  /** Latest head from the server (null once out). */
  head: HeadFrame | null;
  /** Head positions by step, for drawing in the past. */
  history: Map<number, HeadFrame>;
  /** Current and recently ended trails, oldest first. */
  trails: TrailRecord[];
  /** Land over time, oldest first; the last one is the latest. */
  lands: LandVersion[];
}

/** Something that happened, kept so the screen can play it when its step is drawn. */
export interface ReplicaEvent {
  tick: number;
  event: TerritoryEvent;
}

/**
 * The client's copy of the server's match, rebuilt from the snapshot stream: the latest state, plus
 * enough history to draw everyone a little in the past. WebSockets are ordered and lossless, so a
 * gap in the step numbers only happens after a resync; then the client asks for a full sync.
 */
export class Replica {
  tick = -1;
  radius = 0;
  ended = false;
  readonly players = new Map<PlayerId, ReplicaPlayer>();
  /** Events not yet consumed by the screen. */
  readonly pending: ReplicaEvent[] = [];
  /** Bumps on every full sync, so derived caches know to reset. */
  generation = 0;

  get synced(): boolean {
    return this.tick >= 0;
  }

  applyFull(sync: FullSync) {
    this.tick = sync.tick;
    this.radius = sync.radius;
    this.ended = sync.ended;
    this.players.clear();
    this.pending.length = 0;
    this.generation += 1;
    for (const p of sync.players) {
      const head: HeadFrame | null = p.alive
        ? { id: p.id, outside: p.trail.length > 0, x: p.x, y: p.y, heading: p.heading, target: p.target, inputSeq: p.inputSeq, late: p.late }
        : null;
      this.players.set(p.id, {
        id: p.id,
        alive: p.alive,
        outTick: p.outTick,
        outReason: p.outReason,
        cutBy: p.cutBy,
        head,
        history: head ? new Map([[sync.tick, head]]) : new Map(),
        // A trail already out when we joined: its points all count as laid by now.
        trails: p.trail.length ? [{ startTick: sync.tick, endTick: null, points: p.trail.map((pt) => ({ ...pt, tick: sync.tick })) }] : [],
        lands: [{ tick: -Infinity, land: p.land }],
      });
    }
  }

  /** Applies the next step; false if it doesn't follow on (the caller then asks for a full sync). */
  applySnapshot(s: Snapshot): boolean {
    if (!this.synced || s.tick !== this.tick + 1) return false;
    this.tick = s.tick;
    for (const event of s.events) {
      this.applyEvent(s.tick, event);
      this.pending.push({ tick: s.tick, event });
    }
    for (const head of s.heads) {
      const p = this.players.get(head.id);
      if (!p) continue;
      p.head = head;
      p.history.set(s.tick, head);
      const trail = currentTrail(p);
      if (head.outside && trail) {
        const last = trail.points[trail.points.length - 1]!;
        if (last.x !== head.x || last.y !== head.y) trail.points.push({ x: head.x, y: head.y, tick: s.tick });
      } else if (trail) {
        // Home without a capture of their own: their trail became land when they cut someone.
        trail.endTick = s.tick;
      }
    }
    return true;
  }

  private applyEvent(tick: number, event: TerritoryEvent) {
    const p = this.players.get(event.id);
    if (!p) return;
    if (event.type === "trailStart") {
      p.trails.push({ startTick: tick, endTick: null, points: [{ ...event.point, tick }] });
      return;
    }
    const trail = currentTrail(p);
    if (event.type === "capture" && trail) trail.points.push({ ...event.point, tick });
    if (trail) trail.endTick = tick;
    for (const change of event.lands) this.players.get(change.id)?.lands.push({ tick, land: change.land });
    if (event.type === "out") {
      p.alive = false;
      p.outTick = tick;
      p.outReason = event.reason;
      p.cutBy = event.by;
      p.head = null;
    }
  }

  /** Forgets history the screen will never draw again (everything before `tick`). */
  trim(tick: number) {
    const keepFrom = Math.min(tick, this.tick - TERRITORY_CLIENT_CONFIG.net.historyTicks);
    for (const p of this.players.values()) {
      for (const t of p.history.keys()) if (t < keepFrom) p.history.delete(t);
      p.trails = p.trails.filter((t) => t.endTick === null || t.endTick >= keepFrom);
      // Keep the newest land at or before `keepFrom` and everything after it.
      let first = 0;
      while (first + 1 < p.lands.length && p.lands[first + 1]!.tick <= keepFrom) first++;
      if (first > 0) p.lands = p.lands.slice(first);
    }
  }
}

export function currentTrail(p: ReplicaPlayer): TrailRecord | null {
  const last = p.trails[p.trails.length - 1];
  return last && last.endTick === null ? last : null;
}

/** The player's land as of step `tick`. */
export function landAt(p: ReplicaPlayer, tick: number): LandVersion {
  let found = p.lands[0]!;
  for (const version of p.lands) {
    if (version.tick <= tick) found = version;
    else break;
  }
  return found;
}

export function latestLand(p: ReplicaPlayer): LandVersion {
  return p.lands[p.lands.length - 1]!;
}
