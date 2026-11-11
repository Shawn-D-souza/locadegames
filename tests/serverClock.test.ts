import { describe, expect, it } from "vitest";
import { ServerClock } from "../src/web/netcode/serverClock";

const TUNING = { clockSamples: 10, clockSlewRate: 0.1, clockSnapMs: 250 };
/** The server's clock runs this far ahead of the page's. */
const OFFSET = 10_000;

/** A pong whose trip took `rtt`, `late` of it spent waiting on the way back (a busy page reads it late). */
function pong(clock: ServerClock, sentAt: number, rtt: number, late = 0) {
  const oneWay = (rtt - late) / 2;
  clock.addPong(sentAt, sentAt + oneWay + OFFSET, sentAt + rtt);
}

describe("the shared server clock", () => {
  it("settles on the first quick pong", () => {
    const clock = new ServerClock(OFFSET - 120, TUNING);
    pong(clock, 0, 4);
    expect(clock.serverNow(10) - 10).toBeCloseTo(OFFSET, 0);
    expect(clock.rttMs).toBe(4);
  });

  it("one pong read late (a busy page) never sets the round trip, the jitter or the clock", () => {
    const clock = new ServerClock(OFFSET, TUNING);
    // The page froze for 700 ms just as the first pong came back.
    pong(clock, 0, 740, 700);
    // Not trusted: the clock is eased toward it, never jumped.
    expect(Math.abs(clock.serverNow(750) - 750 - OFFSET)).toBeLessThan(TUNING.clockSnapMs);
    pong(clock, 800, 4);
    expect(clock.rttMs).toBe(4);
    expect(clock.jitterMs).toBe(0);
    for (let i = 0; i < 4; i++) pong(clock, 1_200 + i * 400, 4 + (i % 2));
    // A later hiccup among good samples changes nothing either.
    pong(clock, 3_000, 600, 560);
    expect(clock.rttMs).toBeLessThan(6);
    expect(clock.jitterMs).toBeLessThan(2);
    // And the clock ends up right.
    let now = 3_700;
    for (; now < 9_000; now += 16) clock.serverNow(now);
    expect(clock.serverNow(now) - now).toBeCloseTo(OFFSET, 0);
  });

  it("a really slow line is still measured as slow", () => {
    const clock = new ServerClock(OFFSET, TUNING);
    for (let i = 0; i < 6; i++) pong(clock, i * 400, 300 + (i % 3) * 20);
    expect(clock.rttMs).toBe(320);
    expect(clock.jitterMs).toBe(20);
  });

  it("a big error the round trips vouch for is fixed at once", () => {
    const clock = new ServerClock(OFFSET, TUNING);
    pong(clock, 0, 4);
    clock.serverNow(10);
    clock.reset();
    // The phone slept; its clock is now 2 s off.
    clock.addPong(1_000, 1_002 + OFFSET + 2_000, 1_004);
    expect(clock.serverNow(1_010) - 1_010).toBeCloseTo(OFFSET + 2_000, 0);
  });
});
