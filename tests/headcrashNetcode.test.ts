import { layoutFor } from "../src/shared/games/headcrash/layout";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeadCrashDuel } from "../src/server/duel/headCrashDuel";
import { BUTTON_LEFT, BUTTON_RIGHT, HEADCRASH_CONFIG } from "../src/shared/games/headcrash/config";
import { PHASE } from "../src/shared/games/headcrash/types";
import { decodeClientMessage, decodeServerMessage, encodePong } from "../src/shared/games/headcrash/wire";
import type { Seat } from "../src/shared/games/types";
import type { Bytes } from "../src/shared/protocol/bytes";
import type { FrameView } from "../src/web/games/headcrash/engine/frame";
import { HeadCrashClient } from "../src/web/games/headcrash/engine/headCrashClient";

const { tickMs, firstCountdownTicks, drive } = HEADCRASH_CONFIG;
const FRAME_MS = 1000 / 60;
/** A match whose first map is the bowl (closed, flat floor): nobody falls off while the tests drive about. */
const SEED = Array.from({ length: 200 }, (_, seed) => seed).find((seed) => layoutFor(seed, 0).name === "bowl")!;
/** The server's clock runs this far from the phone's, and the room's first guess at that is this wrong. */
const CLOCK_SKEW = 5_000;
const ROOM_GUESS_ERROR = 40;
/** The furthest a car may move between two drawn frames: its top speed over a frame, and room for a blended correction. */
const SMOOTH_STEP = drive.maxSpeed * (FRAME_MS / 1000) + 0.35;

const buffer = (data: Bytes) => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

interface NetOptions {
  /** One-way delay and how much it wobbles (ms). */
  delay: number;
  jitter: number;
  mySeat: Seat | null;
}

/** A server match and a phone joined by a slow line, on fake time; every drawn frame is kept. */
function setup({ delay, jitter, mySeat }: NetOptions) {
  const serverNow = () => Date.now() + CLOCK_SKEW;
  const duel = new HeadCrashDuel(1, SEED, [0, 0], serverNow());
  const toServer: { at: number; data: Bytes }[] = [];
  const toClient: { at: number; data: Bytes }[] = [];
  // The same wobble every run.
  let wobble = 0;
  const lineDelay = () => {
    wobble = (wobble * 7 + 3) % 11;
    return delay + (jitter * wobble) / 10;
  };
  const client = new HeadCrashClient({
    matchId: 1,
    seed: SEED,
    mySeat,
    score: [0, 0],
    startsAt: serverNow(),
    roomClockOffsetMs: CLOCK_SKEW + ROOM_GUESS_ERROR,
    send: (data) => toServer.push({ at: performance.now() + lineDelay(), data }),
  });
  client.start();
  const frames: { at: number; frame: FrameView; serverTick: number }[] = [];
  let nextFrameAt = performance.now();
  let seq = 0;

  /** Runs `ms` of real time, a millisecond at a time. */
  const run = (ms: number) => {
    for (let i = 0; i < ms; i++) {
      vi.advanceTimersByTime(1);
      const now = performance.now();
      for (const message of toServer.splice(0).filter((m) => m.at > now || !deliverToServer(m.data))) toServer.push(message);
      if (duel.advance(serverNow())) toClient.push({ at: now + lineDelay(), data: duel.snapshot() });
      // In order, like a WebSocket: a late message holds back the ones behind it.
      while (toClient.length && toClient[0]!.at <= now) client.receive(buffer(toClient.shift()!.data));
      if (now >= nextFrameAt) {
        nextFrameAt += FRAME_MS;
        frames.push({ at: now, frame: client.frame(now), serverTick: duel.state.tick });
      }
    }
  };
  const deliverToServer = (data: Bytes): boolean => {
    const msg = decodeClientMessage(data);
    if (msg?.kind === "ping") toClient.push({ at: performance.now() + lineDelay(), data: encodePong(msg.clientTime, serverNow()) });
    else if (msg?.kind === "input" && mySeat !== null) duel.input(mySeat, msg.seq, msg.tick, msg.buttons);
    return true;
  };
  /** The other player's buttons, straight into the server (their phone isn't part of the test). */
  const otherPresses = (seat: Seat, buttons: number) => duel.input(seat, ++seq, duel.state.tick + 2, buttons);
  const late = () => {
    const snapshot = decodeServerMessage(duel.snapshot());
    return snapshot?.kind === "snapshot" ? snapshot.late : null;
  };
  return { duel, client, frames, run, otherPresses, late };
}

/** The biggest move of a car between two drawn frames (of the same round). */
function biggestStep(frames: readonly { frame: FrameView }[], seat: Seat): number {
  let biggest = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]!.frame;
    const b = frames[i]!.frame;
    if (a.round !== b.round) continue;
    biggest = Math.max(biggest, Math.hypot(b.cars[seat].x - a.cars[seat].x, b.cars[seat].y - a.cars[seat].y));
  }
  return biggest;
}

describe("Head Crash netcode", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("your own buttons act at once, reach the server in time and never need correcting", () => {
    const net = setup({ delay: 40, jitter: 8, mySeat: 0 });
    net.run(firstCountdownTicks * tickMs + 300);
    expect(net.duel.state.phase).toBe(PHASE.play);
    const before = net.frames.at(-1)!.frame.cars[0].x;
    const pressedAt = net.frames.length;
    net.client.setButtons(BUTTON_RIGHT);
    net.run(60);
    // Three frames later the car is already moving on screen, long before the server could have answered.
    expect(net.frames[pressedAt + 2]!.frame.cars[0].x).toBeGreaterThan(before);
    net.run(700);
    net.client.setButtons(BUTTON_LEFT);
    net.run(500);
    net.client.setButtons(0);
    net.run(400);
    expect(net.late()).toEqual([0, 0]);
    expect(net.client.stats.corrections).toBe(0);
    expect(biggestStep(net.frames, 0)).toBeLessThan(SMOOTH_STEP);
    // The phone plays ahead of the server: the server's car gets where the phone drew it a moment later.
    expect(net.client.stats.leadMs).toBeGreaterThan(40);
    expect(net.client.stats.leadMs).toBeLessThan(120);
  });

  it("the other car is corrected without ever jumping when its driver changes buttons", () => {
    const net = setup({ delay: 40, jitter: 8, mySeat: 0 });
    net.run(firstCountdownTicks * tickMs + 200);
    // The other driver mashes: every change is a surprise to this phone. Both stay near their starts, so nobody gets hit.
    const pattern = [BUTTON_LEFT, 0, BUTTON_RIGHT, BUTTON_LEFT, BUTTON_RIGHT, 0, BUTTON_LEFT];
    for (let i = 0; i < 16; i++) {
      net.otherPresses(1, pattern[i % pattern.length]!);
      net.client.setButtons(i % 2 === 0 ? BUTTON_LEFT : BUTTON_RIGHT);
      net.run(230);
    }
    expect(net.duel.state.phase).toBe(PHASE.play);
    expect(net.late()![0]).toBe(0);
    expect(net.client.stats.corrections).toBeGreaterThan(0);
    expect(net.client.stats.largestCorrection).toBeLessThan(1);
    expect(biggestStep(net.frames, 0)).toBeLessThan(SMOOTH_STEP);
    expect(biggestStep(net.frames, 1)).toBeLessThan(SMOOTH_STEP);
  });

  it("shows a hit and the point only on the server's word, and follows it into the next round", () => {
    const net = setup({ delay: 40, jitter: 8, mySeat: 0 });
    net.run(firstCountdownTicks * tickMs + 100);
    net.client.setButtons(BUTTON_RIGHT);
    for (let i = 0; i < 600 && net.duel.state.round === 0; i++) net.run(100);
    expect(net.duel.state.round).toBe(1);
    net.run(300);
    const hits = net.client.takeMoments().filter((m) => m.kind === "hit");
    expect(hits).toHaveLength(1);
    // No frame showed the hit before the server had it.
    const firstShown = net.frames.find((f) => f.frame.hit !== null)!;
    expect(firstShown.serverTick).toBeGreaterThan(0);
    const shownRound = net.frames.at(-1)!.frame.round;
    expect(shownRound).toBe(1);
    expect(net.client.hud().score).toEqual(net.duel.state.score);
  });

  it("a watcher sees the same match a moment later, drawn smoothly between snapshots", () => {
    const net = setup({ delay: 40, jitter: 8, mySeat: null });
    net.run(firstCountdownTicks * tickMs + 100);
    const pattern = [BUTTON_RIGHT, BUTTON_RIGHT, 0, BUTTON_LEFT, BUTTON_RIGHT];
    for (let i = 0; i < 10 && net.duel.state.phase === PHASE.play; i++) {
      net.otherPresses(0, pattern[i % pattern.length]!);
      net.otherPresses(1, pattern[(i + 2) % pattern.length]!);
      net.run(250);
    }
    expect(net.client.stats.leadMs).toBeLessThan(0);
    expect(biggestStep(net.frames, 0)).toBeLessThan(SMOOTH_STEP);
    expect(biggestStep(net.frames, 1)).toBeLessThan(SMOOTH_STEP);
    // It moved, and it is close behind the server's car.
    const shown = net.frames.at(-1)!.frame;
    if (shown.round === net.duel.state.round && net.duel.state.phase === PHASE.play) {
      expect(Math.abs(shown.cars[0].x - net.duel.state.cars[0].x)).toBeLessThan(4);
    }
    expect(net.frames.some((f) => f.frame.phase === PHASE.play && Math.abs(f.frame.cars[0].vx) > 1)).toBe(true);
  });

  it("says GO when the countdown it showed ends, never when joining a round already being played", () => {
    const net = setup({ delay: 40, jitter: 8, mySeat: 0 });
    net.run(firstCountdownTicks * tickMs + 300);
    expect(net.client.takeMoments().filter((m) => m.kind === "go")).toHaveLength(1);
    // A phone that joins now (a reload, a late watcher) saw no countdown.
    const joiner = new HeadCrashClient({
      matchId: 1,
      seed: SEED,
      mySeat: null,
      score: [0, 0],
      startsAt: Date.now() + CLOCK_SKEW,
      roomClockOffsetMs: CLOCK_SKEW,
      send: () => undefined,
    });
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(FRAME_MS);
      net.duel.advance(Date.now() + CLOCK_SKEW);
      joiner.receive(buffer(net.duel.snapshot()));
      joiner.frame(performance.now());
    }
    expect(joiner.hud().synced).toBe(true);
    expect(joiner.hud().phase).toBe(PHASE.play);
    expect(joiner.takeMoments().filter((m) => m.kind === "go")).toHaveLength(0);
  });

  it("starts the match over with the server after it lost it, buttons included", () => {
    const net = setup({ delay: 30, jitter: 0, mySeat: 0 });
    net.run(firstCountdownTicks * tickMs + 200);
    net.client.setButtons(BUTTON_RIGHT);
    net.run(300);
    // A restarted server: a fresh match on step 0 that knows nothing of the buttons held.
    const fresh = new HeadCrashDuel(1, SEED, [0, 0], Date.now() + CLOCK_SKEW);
    net.client.receive(buffer(fresh.snapshot()));
    const sent: number[] = [];
    const client = net.client as unknown as { options: { send(data: Bytes): void } };
    client.options.send = (data) => {
      const msg = decodeClientMessage(data);
      if (msg?.kind === "input") sent.push(msg.seq, msg.buttons);
    };
    net.client.frame(performance.now());
    // The held button is sent again, numbered from what the new server has.
    expect(sent).toEqual([1, BUTTON_RIGHT]);
  });
});
