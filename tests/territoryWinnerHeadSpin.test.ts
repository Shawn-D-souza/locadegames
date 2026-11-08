import { describe, expect, it } from "vitest";
import { TERRITORY_CLIENT_CONFIG } from "../src/web/games/territory/config";
import { winnerHeadAngle } from "../src/web/games/territory/render/winnerHeadSpin";

const LOOK = TERRITORY_CLIENT_CONFIG.look;
const FACING_US = Math.PI / 2;
const TURN = 2 * Math.PI;
const SPIN_END = LOOK.winnerHeadAtMs + LOOK.winnerHeadSpinMs;

/** The same direction, whatever the number of full turns between them. */
function sameWay(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

describe("territory ending: the winner's head spins round to face us", () => {
  const headings = [0, 0.3, FACING_US, Math.PI, -Math.PI / 2, -2.5, 5, -7];

  it("keeps its heading until the head drops, and faces us once the spin is over", () => {
    for (const angle of headings) {
      expect(winnerHeadAngle(angle, 0)).toBe(angle);
      expect(winnerHeadAngle(angle, LOOK.winnerHeadAtMs)).toBe(angle);
      expect(sameWay(winnerHeadAngle(angle, SPIN_END), FACING_US)).toBeLessThan(1e-9);
      expect(winnerHeadAngle(angle, SPIN_END + 5000)).toBe(winnerHeadAngle(angle, SPIN_END));
    }
  });

  it("spins full turns plus the short way round, one way only, slowing to a stop", () => {
    for (const angle of headings) {
      const total = winnerHeadAngle(angle, SPIN_END) - angle;
      expect(Math.abs(total)).toBeGreaterThan(LOOK.winnerHeadSpins * TURN - 1e-9);
      expect(Math.abs(total)).toBeLessThanOrEqual(LOOK.winnerHeadSpins * TURN + Math.PI + 1e-9);
      let last = angle;
      let lastStep = Infinity;
      for (let ms = LOOK.winnerHeadAtMs + 50; ms <= SPIN_END; ms += 50) {
        const now = winnerHeadAngle(angle, ms);
        const step = Math.abs(now - last);
        expect(Math.sign(now - last)).toBe(Math.sign(total));
        expect(step).toBeLessThanOrEqual(lastStep + 1e-9);
        last = now;
        lastStep = step;
      }
    }
  });
});
