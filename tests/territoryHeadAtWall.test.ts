import { describe, expect, it } from "vitest";
import { headLimit } from "../src/shared/games/territory/arena";
import { TERRITORY_CONFIG } from "../src/shared/games/territory/config";
import { TERRITORY_CLIENT_CONFIG } from "../src/web/games/territory/config";
import { headAtWall, headReach } from "../src/web/games/territory/render/headAtWall";

const RADIUS = 30_000;
const WALL_INNER = RADIUS - (TERRITORY_CLIENT_CONFIG.look.wallLine * TERRITORY_CONFIG.trailWidth) / 2;

describe("headAtWall", () => {
  it("leaves a head away from the wall where it is", () => {
    const head = { x: 1_000, y: -2_000, angle: 0.7 };
    expect(headAtWall(head, RADIUS)).toEqual(head);
  });

  it("draws a head at the wall just inside it, at every angle and turn", () => {
    for (let i = 0; i < 16; i++) {
      const place = (2 * Math.PI * i) / 16;
      for (let j = 0; j < 8; j++) {
        const angle = (2 * Math.PI * j) / 8;
        const limit = headLimit(RADIUS);
        const head = { x: limit * Math.cos(place), y: limit * Math.sin(place), angle };
        const drawn = headAtWall(head, RADIUS);
        const distance = Math.hypot(drawn.x, drawn.y);
        expect(distance + headReach(angle, Math.cos(place), Math.sin(place))).toBeCloseTo(WALL_INNER, 6);
        expect(drawn.angle).toBe(angle);
        expect(Math.atan2(drawn.y, drawn.x)).toBeCloseTo(Math.atan2(head.y, head.x), 9);
      }
    }
  });

  it("keeps a hopping head inside the top wall, and lets it hop off the bottom one", () => {
    const lift = 0.5 * TERRITORY_CONFIG.trailWidth;
    const limit = headLimit(RADIUS);
    const top = headAtWall({ x: 0, y: -limit, angle: 0 }, RADIUS, lift);
    expect(-top.y + headReach(0, 0, -1, lift)).toBeCloseTo(WALL_INNER, 6);
    expect(headAtWall({ x: 0, y: limit, angle: 0 }, RADIUS, lift)).toEqual(headAtWall({ x: 0, y: limit, angle: 0 }, RADIUS));
  });

  it("reaches exactly as far as the drawn cube, top and bottom, in every direction", () => {
    const W = TERRITORY_CONFIG.trailWidth;
    const head = TERRITORY_CLIENT_CONFIG.look.head;
    const half = (TERRITORY_CLIENT_CONFIG.look.headSize * W) / 2;
    const corner = head.corner * W;
    // The rounded square's outline, finely, then turned, tilted, and copied one side higher.
    const square: [number, number][] = [];
    for (const [cx, cy, from] of [
      [1, 1, 0],
      [-1, 1, 0.5],
      [-1, -1, 1],
      [1, -1, 1.5],
    ] as const) {
      for (let i = 0; i <= 90; i++) {
        const a = (from + i / 180) * Math.PI;
        square.push([cx * (half - corner) + corner * Math.cos(a), cy * (half - corner) + corner * Math.sin(a)]);
      }
    }
    for (let j = 0; j < 12; j++) {
      const angle = (2 * Math.PI * j) / 12 + 0.1;
      const points = square.flatMap(([x, y]): [number, number][] => {
        const sx = x * Math.cos(angle) - y * Math.sin(angle);
        const sy = head.tilt * (x * Math.sin(angle) + y * Math.cos(angle));
        return [
          [sx, sy],
          [sx, sy - head.side * W],
        ];
      });
      for (let i = 0; i < 24; i++) {
        const place = (2 * Math.PI * i) / 24;
        const ux = Math.cos(place);
        const uy = Math.sin(place);
        const drawn = Math.max(...points.map(([x, y]) => x * ux + y * uy)) + (head.outline * W) / 2;
        expect(headReach(angle, ux, uy)).toBeCloseTo(drawn, 0);
      }
    }
  });
});
