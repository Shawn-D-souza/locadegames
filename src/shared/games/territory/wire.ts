import { ByteReader, ByteWriter, type Bytes } from "../../protocol/bytes";
import type { PlayerId } from "../../rooms/types";
import { TERRITORY_CONFIG } from "./config";
import type { Land, LandChange, OutReason, Point, TerritoryEvent, TerritoryPlayer } from "./types";

/**
 * Territory's binary messages (WebSocket binary frames; room messages stay JSON text).
 * Server → client: a snapshot every step, a full sync on join/request, pong for the clock.
 * Client → server: steering input (only when it changes), ping, sync request.
 * WebSockets are ordered and reliable, so snapshots carry only what changed: every head, plus events.
 */

const SERVER = { snapshot: 1, full: 2, pong: 3 } as const;
const CLIENT = { input: 0x11, ping: 0x12, sync: 0x13 } as const;
const EVENT = { trailStart: 1, capture: 2, out: 3 } as const;
const REASONS: readonly OutReason[] = ["cut", "land", "quit"];
const NONE = 0xff;
const NO_TICK = 0xffffffff;

/** One head in a snapshot. */
export interface HeadFrame {
  id: PlayerId;
  /** Out of their land with a trail. */
  outside: boolean;
  x: number;
  y: number;
  heading: number;
  target: number;
  /** Last steering input the server applied for this player (for their own reconciliation). */
  inputSeq: number;
  /** Counts (mod 256) inputs that reached the server too late for their step; the client then sends earlier. */
  late: number;
}

export interface Snapshot {
  kind: "snapshot";
  tick: number;
  /** Players still in. */
  heads: HeadFrame[];
  events: TerritoryEvent[];
}

export interface SyncedPlayer extends TerritoryPlayer {
  inputSeq: number;
  late: number;
}

export interface FullSync {
  kind: "full";
  tick: number;
  radius: number;
  ended: boolean;
  players: SyncedPlayer[];
}

export interface Pong {
  kind: "pong";
  /** The client's own clock when it sent the ping (echoed back). */
  clientTime: number;
  serverTime: number;
  /** Server time of step 0; moves later if the server ever stalls and skips time. */
  tickZeroAt: number;
}

export type TerritoryServerMessage = Snapshot | FullSync | Pong;

export type TerritoryClientMessage =
  | { kind: "input"; seq: number; tick: number; target: number }
  | { kind: "ping"; clientTime: number }
  | { kind: "sync" };

// --- Points and land: first point absolute, then deltas, all as zigzag varints. ---

function writePoints(w: ByteWriter, points: readonly Point[]) {
  w.varuint(points.length);
  let px = 0;
  let py = 0;
  for (const p of points) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    w.varint(x - px).varint(y - py);
    px = x;
    py = y;
  }
}

function readPoints(r: ByteReader): Point[] {
  const count = r.varuint();
  const points: Point[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < count; i++) {
    x += r.varint();
    y += r.varint();
    points.push({ x, y });
  }
  return points;
}

function writeLand(w: ByteWriter, land: Land) {
  w.varuint(land.length);
  for (const ring of land) writePoints(w, ring);
}

function readLand(r: ByteReader): Land {
  const count = r.varuint();
  return Array.from({ length: count }, () => readPoints(r));
}

function writeLandChanges(w: ByteWriter, lands: readonly LandChange[]) {
  w.varuint(lands.length);
  for (const change of lands) {
    w.u8(change.id);
    writeLand(w, change.land);
  }
}

function readLandChanges(r: ByteReader): LandChange[] {
  const count = r.varuint();
  return Array.from({ length: count }, () => ({ id: r.u8(), land: readLand(r) }));
}

function writePoint(w: ByteWriter, p: Point) {
  w.i32(p.x).i32(p.y);
}

function readPoint(r: ByteReader): Point {
  return { x: r.i32(), y: r.i32() };
}

function writeEvent(w: ByteWriter, event: TerritoryEvent) {
  switch (event.type) {
    case "trailStart":
      w.u8(EVENT.trailStart).u8(event.id);
      writePoint(w, event.point);
      return;
    case "capture":
      w.u8(EVENT.capture).u8(event.id);
      writePoint(w, event.point);
      writeLandChanges(w, event.lands);
      return;
    case "out":
      w.u8(EVENT.out).u8(event.id).u8(REASONS.indexOf(event.reason)).u8(event.by ?? NONE);
      writeLandChanges(w, event.lands);
      return;
  }
}

function readEvent(r: ByteReader): TerritoryEvent {
  const type = r.u8();
  const id = r.u8();
  if (type === EVENT.trailStart) return { type: "trailStart", id, point: readPoint(r) };
  if (type === EVENT.capture) return { type: "capture", id, point: readPoint(r), lands: readLandChanges(r) };
  if (type === EVENT.out) {
    const reason = REASONS[r.u8()];
    const by = r.u8();
    if (!reason) throw new RangeError("bad reason");
    return { type: "out", id, reason, by: by === NONE ? null : by, lands: readLandChanges(r) };
  }
  throw new RangeError("bad event");
}

function writeHead(w: ByteWriter, h: HeadFrame) {
  w.u8(h.id).u8(h.outside ? 1 : 0).i32(h.x).i32(h.y).u16(h.heading).u16(h.target).u16(h.inputSeq).u8(h.late);
}

function readHead(r: ByteReader): HeadFrame {
  const id = r.u8();
  const outside = r.u8() === 1;
  return { id, outside, x: r.i32(), y: r.i32(), heading: r.u16(), target: r.u16(), inputSeq: r.u16(), late: r.u8() };
}

// --- Server → client ---

export function encodeSnapshot(s: Omit<Snapshot, "kind">): Bytes {
  const w = new ByteWriter(64 + s.heads.length * 16);
  w.u8(SERVER.snapshot).u32(s.tick).u8(s.heads.length);
  for (const h of s.heads) writeHead(w, h);
  w.varuint(s.events.length);
  for (const e of s.events) writeEvent(w, e);
  return w.bytes();
}

export function encodeFullSync(s: Omit<FullSync, "kind">): Bytes {
  const w = new ByteWriter(4096);
  w.u8(SERVER.full).u32(s.tick).u32(s.radius).u8(s.ended ? 1 : 0).u8(s.players.length);
  for (const p of s.players) {
    writeHead(w, { ...p, outside: p.trail.length > 0 });
    w.u8(p.alive ? 1 : 0)
      .u32(p.outTick ?? NO_TICK)
      .u8(p.outReason ? REASONS.indexOf(p.outReason) : NONE)
      .u8(p.cutBy ?? NONE);
    writePoints(w, p.trail);
    writeLand(w, p.land);
  }
  return w.bytes();
}

export function encodePong(clientTime: number, serverTime: number, tickZeroAt: number): Bytes {
  return new ByteWriter(25).u8(SERVER.pong).f64(clientTime).f64(serverTime).f64(tickZeroAt).bytes();
}

export function decodeServerMessage(data: ArrayBuffer | Uint8Array): TerritoryServerMessage | null {
  try {
    const r = new ByteReader(data);
    const type = r.u8();
    if (type === SERVER.snapshot) {
      const tick = r.u32();
      const heads = Array.from({ length: r.u8() }, () => readHead(r));
      const events = Array.from({ length: r.varuint() }, () => readEvent(r));
      return { kind: "snapshot", tick, heads, events };
    }
    if (type === SERVER.full) {
      const tick = r.u32();
      const radius = r.u32();
      const ended = r.u8() === 1;
      const players = Array.from({ length: r.u8() }, (): SyncedPlayer => {
        const head = readHead(r);
        const alive = r.u8() === 1;
        const outTick = r.u32();
        const reason = r.u8();
        const cutBy = r.u8();
        return {
          id: head.id,
          x: head.x,
          y: head.y,
          heading: head.heading,
          target: head.target,
          inputSeq: head.inputSeq,
          late: head.late,
          alive,
          outTick: outTick === NO_TICK ? null : outTick,
          outReason: reason === NONE ? null : (REASONS[reason] ?? null),
          cutBy: cutBy === NONE ? null : cutBy,
          trail: readPoints(r),
          land: readLand(r),
        };
      });
      return { kind: "full", tick, radius, ended, players };
    }
    if (type === SERVER.pong) return { kind: "pong", clientTime: r.f64(), serverTime: r.f64(), tickZeroAt: r.f64() };
    return null;
  } catch {
    return null;
  }
}

// --- Client → server ---

export function encodeClientMessage(m: TerritoryClientMessage): Bytes {
  switch (m.kind) {
    case "input":
      return new ByteWriter(9).u8(CLIENT.input).u16(m.seq).u32(m.tick).u16(m.target).bytes();
    case "ping":
      return new ByteWriter(9).u8(CLIENT.ping).f64(m.clientTime).bytes();
    case "sync":
      return new ByteWriter(1).u8(CLIENT.sync).bytes();
  }
}

/** Validates an untrusted client frame; null if malformed. */
export function decodeClientMessage(data: ArrayBuffer | Uint8Array): TerritoryClientMessage | null {
  const length = data.byteLength;
  try {
    const r = new ByteReader(data);
    const type = r.u8();
    if (type === CLIENT.input && length === 9) {
      const seq = r.u16();
      const tick = r.u32();
      const target = r.u16();
      return target < TERRITORY_CONFIG.angleSteps ? { kind: "input", seq, tick, target } : null;
    }
    if (type === CLIENT.ping && length === 9) {
      const clientTime = r.f64();
      return Number.isFinite(clientTime) ? { kind: "ping", clientTime } : null;
    }
    if (type === CLIENT.sync && length === 1) return { kind: "sync" };
    return null;
  } catch {
    return null;
  }
}
