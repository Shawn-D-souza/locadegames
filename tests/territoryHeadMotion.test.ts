import { describe, expect, it } from "vitest";
import type { PlayerFrame } from "../src/web/games/territory/engine/frame";
import { TERRITORY_CLIENT_CONFIG } from "../src/web/games/territory/config";
import { HeadMotion } from "../src/web/games/territory/render/headMotion";

const FRAME_MS = 1000 / 60;
const BLINK = TERRITORY_CLIENT_CONFIG.look.headMotion;

function frame(id: number): PlayerFrame {
  return { id, isMe: false, head: { x: 0, y: 0, angle: 0 }, trail: null, land: [], home: [] };
}

describe("HeadMotion", () => {
  it("blinks now and then, each player at their own times, and opens again", () => {
    const motion = new HeadMotion();
    const shut = new Map<number, number[]>([
      [0, []],
      [1, []],
    ]);
    for (let t = 0; t < 2 * BLINK.blinkEveryMs[1]; t += FRAME_MS) {
      motion.update([frame(0), frame(1)], t);
      for (const id of [0, 1]) if (motion.stance(id).blink > 0.9) shut.get(id)!.push(Math.round(t));
    }
    const first = [shut.get(0)![0], shut.get(1)![0]];
    expect(first[0]).toBeDefined();
    expect(first[1]).toBeDefined();
    expect(first[0]).not.toBe(first[1]);
    expect(motion.stance(0).blink).toBeLessThan(1);
  });

  it("stays on the ground except when it hops for joy, spinning only on a knockout", () => {
    const motion = new HeadMotion();
    motion.update([frame(0)], 0);
    expect(motion.stance(0).lift).toBe(0);
    const W = 1000;
    const effects = [{ kind: "cheer" as const, id: 0, height: 0.4 * W, ms: 400, spins: 1, startedAt: 100 }];
    motion.update([frame(0)], 300, effects);
    expect(motion.stance(0).lift).toBeCloseTo(0.4 * W, 6);
    expect(motion.stance(0).spin).toBeCloseTo(Math.PI, 6);
    motion.update([frame(0)], 500, effects);
    expect(motion.stance(0).lift).toBe(0);
    expect(motion.stance(0).spin).toBe(0);
    // Someone else's cheer doesn't lift this head.
    motion.update([frame(0)], 600, [{ ...effects[0]!, id: 1, startedAt: 550 }]);
    expect(motion.stance(0).lift).toBe(0);
  });
});
