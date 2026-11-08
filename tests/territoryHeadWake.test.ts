import { describe, expect, it } from "vitest";
import { TERRITORY_CONFIG } from "../src/shared/games/territory/config";
import { TERRITORY_CLIENT_CONFIG } from "../src/web/games/territory/config";
import type { PlayerFrame } from "../src/web/games/territory/engine/frame";
import { HeadWake } from "../src/web/games/territory/render/headWake";

const W = TERRITORY_CONFIG.trailWidth;
const WAKE = TERRITORY_CLIENT_CONFIG.look.wake;

function player(x: number, trail: boolean): PlayerFrame {
  return { id: 2, isMe: false, head: { x, y: 0, angle: 0 }, trail: trail ? [{ x: -W, y: 0 }, { x, y: 0 }] : null, land: [], home: [] } as PlayerFrame;
}

/** How many puffs show. */
function puffsDrawn(wake: HeadWake, now: number): number {
  let count = 0;
  wake.forEachPuff(now, () => (count += 1));
  return count;
}

/** Moves a head right for `ms`, one frame every 16 ms. */
function run(wake: HeadWake, ms: number, trail: boolean, moving = true) {
  for (let now = 0; now <= ms; now += 16) wake.update([player(moving ? now * 0.01 * W : 0, trail)], now);
}

describe("territory head wake", () => {
  it("leaves puffs behind a head moving through its own land", () => {
    const wake = new HeadWake();
    run(wake, 400, false);
    expect(puffsDrawn(wake, 400)).toBeGreaterThan(1);
  });

  it("leaves none out of its land, or standing still", () => {
    const out = new HeadWake();
    run(out, 400, true);
    expect(puffsDrawn(out, 400)).toBe(0);
    const still = new HeadWake();
    run(still, 400, false, false);
    expect(puffsDrawn(still, 400)).toBe(0);
  });

  it("lets every puff fade away", () => {
    const wake = new HeadWake();
    run(wake, 400, false);
    wake.update([], 400 + WAKE.lifeMs);
    expect(puffsDrawn(wake, 400 + WAKE.lifeMs)).toBe(0);
  });
});
