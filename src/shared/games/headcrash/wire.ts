import { ByteReader, ByteWriter, type Bytes } from "../../protocol/bytes";
import { HIT_CAUSE, PHASE, type Car, type HeadCrashState, type HitCause, type Phase } from "./types";

/**
 * Head Crash's binary messages (WebSocket binary frames; room messages stay JSON text).
 * Server → client: the whole match state 30 times a second (it is small: two cars, the score, the phase), so a
 * phone needs nothing else to join, rejoin or correct itself; and pong for the clock.
 * Client → server: the buttons when they change, ping, and watching someone else's match.
 * Snapshots and buttons name their match, since a room runs several at once.
 */

const SERVER = { snapshot: 0x41, pong: 0x42 } as const;
const CLIENT = { input: 0x51, ping: 0x52, watch: 0x53, unwatch: 0x54 } as const;
const PHASES: readonly Phase[] = [PHASE.countdown, PHASE.play, PHASE.hit, PHASE.over];
const CAUSES: readonly HitCause[] = [HIT_CAUSE.car, HIT_CAUSE.arena, HIT_CAUSE.water];
const BUTTON_MASK = 3;
/** Most button changes a snapshot lists as still to come. */
const MAX_PENDING = 8;

/** Newer in u16 sequence space (button changes are numbered, and the numbers wrap after 65,535). */
export const isNewerSeq = (seq: number, than: number) => {
  const diff = (seq - than) & 0xffff;
  return diff > 0 && diff < 0x8000;
};

/** A button change the server has received but not reached yet (it was sent for a step still ahead). */
export interface PendingInput {
  seat: number;
  tick: number;
  buttons: number;
}

export interface Snapshot {
  kind: "snapshot";
  matchId: number;
  /** Server time of step 0; moves later if the server ever stalls and skips time. */
  tickZeroAt: number;
  /** Everything about the match but its seed (both sides know it from the room). */
  state: Omit<HeadCrashState, "seed">;
  /** Per seat: the last button change the server applied, and how many arrived too late for their step (mod 256). */
  inputSeq: [number, number];
  late: [number, number];
  pending: PendingInput[];
}

export interface Pong {
  kind: "pong";
  /** The client's own clock when it sent the ping (echoed back). */
  clientTime: number;
  serverTime: number;
}

export type HeadCrashServerMessage = Snapshot | Pong;

export type HeadCrashClientMessage =
  | { kind: "input"; matchId: number; seq: number; tick: number; buttons: number }
  | { kind: "ping"; clientTime: number }
  | { kind: "watch"; matchId: number }
  | { kind: "unwatch"; matchId: number };

function writeCar(w: ByteWriter, car: Car) {
  w.f32(car.x).f32(car.y).f32(car.angle).f32(car.vx).f32(car.vy).f32(car.spin);
}

function readCar(r: ByteReader): Car {
  return { x: r.f32(), y: r.f32(), angle: r.f32(), vx: r.f32(), vy: r.f32(), spin: r.f32() };
}

// --- Server → client ---

export function encodeSnapshot(s: Omit<Snapshot, "kind">): Bytes {
  const { state } = s;
  const w = new ByteWriter(96);
  w.u8(SERVER.snapshot).varuint(s.matchId).f64(s.tickZeroAt).u32(state.tick).u16(state.round).u8(state.phase).u16(state.phaseTicks);
  w.u8(state.score[0]).u8(state.score[1]).u8(state.deadRounds);
  w.u8((state.buttons[0] & BUTTON_MASK) | ((state.buttons[1] & BUTTON_MASK) << 2));
  w.u16(s.inputSeq[0]).u16(s.inputSeq[1]).u8(s.late[0]).u8(s.late[1]);
  writeCar(w, state.cars[0]);
  writeCar(w, state.cars[1]);
  const hit = state.hit;
  // Bit 0 and 1: whose head; bits 2-3: what touched it; bit 7: there is a hit.
  w.u8(hit ? 0x80 | (hit.victims[0] ? 1 : 0) | (hit.victims[1] ? 2 : 0) | (hit.cause << 2) : 0);
  if (hit) w.f32(hit.x).f32(hit.y).f32(hit.waterY).u16(hit.playTicks);
  const pending = s.pending.slice(0, MAX_PENDING);
  w.u8(pending.length);
  for (const p of pending) w.u8(p.seat | ((p.buttons & BUTTON_MASK) << 1)).varuint(Math.max(0, p.tick - state.tick));
  return w.bytes();
}

export function encodePong(clientTime: number, serverTime: number): Bytes {
  return new ByteWriter(17).u8(SERVER.pong).f64(clientTime).f64(serverTime).bytes();
}

export function decodeServerMessage(data: ArrayBuffer | Uint8Array): HeadCrashServerMessage | null {
  try {
    const r = new ByteReader(data);
    const type = r.u8();
    if (type === SERVER.pong) return { kind: "pong", clientTime: r.f64(), serverTime: r.f64() };
    if (type !== SERVER.snapshot) return null;
    const matchId = r.varuint();
    const tickZeroAt = r.f64();
    const tick = r.u32();
    const round = r.u16();
    const phase = PHASES[r.u8()];
    if (phase === undefined) return null;
    const phaseTicks = r.u16();
    const score: [number, number] = [r.u8(), r.u8()];
    const deadRounds = r.u8();
    const held = r.u8();
    const inputSeq: [number, number] = [r.u16(), r.u16()];
    const late: [number, number] = [r.u8(), r.u8()];
    const cars: [Car, Car] = [readCar(r), readCar(r)];
    const hitBits = r.u8();
    const cause = CAUSES[(hitBits >> 2) & 3];
    const hit = hitBits & 0x80 && cause !== undefined ? { victims: [(hitBits & 1) === 1, (hitBits & 2) === 2] as [boolean, boolean], cause, x: r.f32(), y: r.f32(), waterY: r.f32(), playTicks: r.u16() } : null;
    const pending = Array.from({ length: r.u8() }, (): PendingInput => {
      const bits = r.u8();
      return { seat: bits & 1, buttons: (bits >> 1) & BUTTON_MASK, tick: tick + r.varuint() };
    });
    return {
      kind: "snapshot",
      matchId,
      tickZeroAt,
      state: { tick, round, phase, phaseTicks, score, deadRounds, cars, buttons: [held & BUTTON_MASK, (held >> 2) & BUTTON_MASK], hit },
      inputSeq,
      late,
      pending,
    };
  } catch {
    return null;
  }
}

// --- Client → server ---

export function encodeClientMessage(m: HeadCrashClientMessage): Bytes {
  const w = new ByteWriter(16);
  switch (m.kind) {
    case "input":
      return w.u8(CLIENT.input).varuint(m.matchId).u16(m.seq).u32(m.tick).u8(m.buttons).bytes();
    case "ping":
      return w.u8(CLIENT.ping).f64(m.clientTime).bytes();
    case "watch":
      return w.u8(CLIENT.watch).varuint(m.matchId).bytes();
    case "unwatch":
      return w.u8(CLIENT.unwatch).varuint(m.matchId).bytes();
  }
}

/** Validates an untrusted client frame; null if malformed. */
export function decodeClientMessage(data: ArrayBuffer | Uint8Array): HeadCrashClientMessage | null {
  try {
    const r = new ByteReader(data);
    const type = r.u8();
    let message: HeadCrashClientMessage | null = null;
    if (type === CLIENT.ping) {
      const clientTime = r.f64();
      return Number.isFinite(clientTime) && r.done ? { kind: "ping", clientTime } : null;
    }
    const matchId = r.varuint();
    if (type === CLIENT.input) {
      const seq = r.u16();
      const tick = r.u32();
      const buttons = r.u8();
      if (buttons <= BUTTON_MASK) message = { kind: "input", matchId, seq, tick, buttons };
    } else if (type === CLIENT.watch) message = { kind: "watch", matchId };
    else if (type === CLIENT.unwatch) message = { kind: "unwatch", matchId };
    return message && r.done ? message : null;
  } catch {
    return null;
  }
}
