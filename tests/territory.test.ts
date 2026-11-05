import { describe, expect, it } from "vitest";
import { difference, FillRule, union } from "clipper2-ts";
import { arenaPolygon, headLimit } from "../src/shared/games/territory/arena";
import { captureLand, keepConnected, landPieces, trailArea } from "../src/shared/games/territory/capture";
import { TERRITORY_CONFIG, TERRITORY_TICKS } from "../src/shared/games/territory/config";
import { landArea, pointInLand } from "../src/shared/games/territory/geometry";
import { angleOf, moveHead, turnToward } from "../src/shared/games/territory/movement";
import { rankTerritory } from "../src/shared/games/territory/ranking";
import { arenaShape, createTerritory, stepTerritory } from "../src/shared/games/territory/simulation";
import type { Land, Point, TerritoryPlayer, TerritoryState } from "../src/shared/games/territory/types";
import {
  decodeClientMessage,
  decodeServerMessage,
  encodeClientMessage,
  encodeFullSync,
  encodeSnapshot,
} from "../src/shared/games/territory/wire";

const W = TERRITORY_CONFIG.trailWidth;
const RADIUS = 40_000;
const shape = arenaShape(RADIUS);

const square = (cx: number, cy: number, half: number): Land => [
  [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
  ],
];

/** A two-player state with hand-placed land and heads, so tests control every position. */
function stateWith(players: Partial<TerritoryPlayer>[]): TerritoryState {
  const s = createTerritory(
    players.map((_, i) => i),
    RADIUS,
  );
  players.forEach((p, i) => Object.assign(s.players[i]!, p));
  return s;
}

const rect = (x0: number, y0: number, x1: number, y1: number): Land => [
  [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ],
];

/** Drives player 0 through `points` while player 1 circles `orbit` (staying put, more or less). */
function driveWhileOrbiting(s: TerritoryState, points: Point[], orbit: Point) {
  const events = [];
  for (const to of points) {
    for (let i = 0; i < 400 && !s.ended; i++) {
      const [p, q] = s.players as [TerritoryPlayer, TerritoryPlayer];
      if (Math.hypot(to.x - p.x, to.y - p.y) < TERRITORY_CONFIG.speedPerStep) break;
      const targets = new Map([
        [0, angleOf(to.x - p.x, to.y - p.y)],
        [1, angleOf(orbit.x - q.x, orbit.y - q.y)],
      ]);
      events.push(...stepTerritory(s, shape, { targets }));
    }
  }
  return events;
}

/** Steers player `id` toward `to` each step until its head gets there (or `max` steps pass). */
function driveTo(s: TerritoryState, id: number, to: Point, max = 400) {
  const events = [];
  for (let i = 0; i < max && !s.ended; i++) {
    const p = s.players[id]!;
    if (Math.hypot(to.x - p.x, to.y - p.y) < TERRITORY_CONFIG.speedPerStep) break;
    events.push(...stepTerritory(s, shape, { targets: new Map([[id, angleOf(to.x - p.x, to.y - p.y)]]) }));
  }
  return events;
}

describe("territory movement", () => {
  it("turns at most the turn rate, the short way round", () => {
    expect(turnToward(0, 100)).toBe(100);
    expect(turnToward(0, 2_000)).toBe(TERRITORY_CONFIG.turnPerStep);
    expect(turnToward(0, 3_000)).toBe(TERRITORY_CONFIG.angleSteps - TERRITORY_CONFIG.turnPerStep);
  });

  it("is exact integer math and slides along the wall", () => {
    let head = { x: 0, y: 0, heading: 0 };
    const limit = headLimit(RADIUS);
    for (let i = 0; i < 400; i++) head = moveHead(head, 0, limit);
    expect(Number.isInteger(head.x) && Number.isInteger(head.y)).toBe(true);
    expect(Math.hypot(head.x, head.y)).toBeLessThanOrEqual(limit);
    expect(head.x).toBeGreaterThan(limit - 2);
  });
});

describe("territory capture", () => {
  const home = square(0, 0, 3_000);
  // Out of the right edge, a box with sharp corners, back in.
  const trail: Point[] = [
    { x: 3_000, y: -1_000 },
    { x: 9_000, y: -1_000 },
    { x: 9_000, y: 6_000 },
    { x: 0, y: 6_000 },
    { x: 0, y: 3_000 },
  ];

  it("is exactly the land, the drawn trail and what it encloses", () => {
    const land = captureLand(home, trail, shape);
    const enclosed: Land = [[{ x: 0, y: -1_000 }, { x: 9_000, y: -1_000 }, { x: 9_000, y: 6_000 }, { x: 0, y: 6_000 }]];
    const expected = union(union(home, trailArea(trail, shape.headLimit), FillRule.NonZero), enclosed, FillRule.NonZero);
    expect(landArea(land)).toBe(landArea(expected));
    // Sharp corner stays sharp on the inside, and the trail's full width is land on the outside.
    expect(pointInLand(land, { x: 8_600, y: 5_600 })).toBe(true);
    expect(pointInLand(land, { x: 9_000 + W / 2 - 20, y: 2_000 })).toBe(true);
    expect(pointInLand(land, { x: 9_000 + W / 2 + 20, y: 2_000 })).toBe(false);
    // Rounded join on the outside of the corner, exactly like the drawn stroke.
    expect(pointInLand(land, { x: 9_000 + W / 2 - 20, y: 6_000 + W / 2 - 20 })).toBe(false);
  });

  it("keeps an enemy island the trail did not touch", () => {
    // Home with a hole (someone else's land inside it).
    const holed: Land = [...square(0, 0, 3_000), [...square(0, 0, 1_000)[0]!].reverse()];
    const land = captureLand(holed, trail, shape);
    expect(pointInLand(land, { x: 0, y: 0 })).toBe(false);
    expect(pointInLand(land, { x: 5_000, y: 3_000 })).toBe(true);
  });

  it("reaches the arena edge when the trail runs along the wall", () => {
    const limit = shape.headLimit;
    const at = (deg: number, r = limit) => ({
      x: Math.round(r * Math.cos((deg * Math.PI) / 180)),
      y: Math.round(r * Math.sin((deg * Math.PI) / 180)),
    });
    // Land touching the wall near 0°, a trail out along the wall to 20°, then back to the land.
    const base = square(at(0, RADIUS - 3_000).x, 0, 3_000);
    const along = [at(-2, limit - 2_000), at(0), at(5), at(10), at(15), at(20), at(20, limit - 4_000), at(5, RADIUS - 4_500)];
    const land = captureLand(base, along, shape);
    const edge = at(12, RADIUS - 2);
    expect(pointInLand(land, edge)).toBe(true);
    expect(pointInLand(land, at(12, RADIUS - 2_000))).toBe(true);
    // The rest of the arena stays open.
    expect(pointInLand(land, at(180, RADIUS / 2))).toBe(false);
  });
});

describe("territory land pieces", () => {
  it("keeps the part at the anchor, the biggest part of other pieces, and separate pieces", () => {
    const home = square(0, 0, 5_000);
    const far = square(20_000, 0, 5_000);
    const before = [...home, ...far];
    // A slice through each piece, off-center in the far one.
    const after = difference(before, [...rect(-500, -6_000, 500, 6_000), ...rect(21_000, -6_000, 22_000, 6_000)], FillRule.NonZero);
    expect(landPieces(after)).toHaveLength(4);
    const kept = keepConnected(before, after, { x: 3_000, y: 0 });
    expect(landPieces(kept)).toHaveLength(2);
    expect(pointInLand(kept, { x: 3_000, y: 0 })).toBe(true);
    expect(pointInLand(kept, { x: -3_000, y: 0 })).toBe(false);
    expect(pointInLand(kept, { x: 17_000, y: 0 })).toBe(true);
    expect(pointInLand(kept, { x: 24_000, y: 0 })).toBe(false);
  });

  it("leaves land alone when nothing was cut in two", () => {
    const before = square(0, 0, 5_000);
    const after = difference(before, rect(4_000, -6_000, 6_000, 6_000), FillRule.NonZero);
    expect(keepConnected(before, after, { x: 0, y: 0 })).toBe(after);
  });
});

describe("territory match", () => {
  it("starts everyone on their own land, frozen until the first step", () => {
    const s = createTerritory([0, 1, 2], RADIUS);
    for (const p of s.players) expect(pointInLand(p.land, p)).toBe(true);
    expect(s.tick).toBe(0);
  });

  it("starts the trail exactly on the land's edge and captures on coming home", () => {
    const s = stateWith([{ x: 0, y: 0, heading: 0, target: 0, land: square(0, 0, 3_000) }, { x: -30_000, y: 0, land: square(-30_000, 0, 3_000) }]);
    const events = driveTo(s, 0, { x: 8_000, y: 0 });
    const start = events.find((e) => e.type === "trailStart");
    expect(start?.type === "trailStart" && start.point.x).toBe(3_000);
    driveTo(s, 0, { x: 8_000, y: 6_000 });
    driveTo(s, 0, { x: 0, y: 6_000 });
    const back = driveTo(s, 0, { x: 0, y: 0 });
    expect(back.some((e) => e.type === "capture")).toBe(true);
    const me = s.players[0]!;
    expect(me.trail).toEqual([]);
    expect(pointInLand(me.land, { x: 5_000, y: 3_000 })).toBe(true);
  });

  it("lets you cross your own trail", () => {
    const s = stateWith([{ x: 0, y: 0, heading: 0, target: 0, land: square(0, 0, 3_000) }, { x: -30_000, y: 0, land: square(-30_000, 0, 3_000) }]);
    driveTo(s, 0, { x: 10_000, y: 0 });
    driveTo(s, 0, { x: 10_000, y: 4_000 });
    driveTo(s, 0, { x: 7_000, y: 4_000 });
    driveTo(s, 0, { x: 7_000, y: -3_000 });
    expect(s.players[0]!.alive).toBe(true);
  });

  it("knocks out a cut player and gives their land to the cutter", () => {
    const s = stateWith([
      { x: 0, y: 0, heading: 0, target: 0, land: square(0, 0, 3_000) },
      { x: 6_000, y: -8_000, heading: 1_024, target: 1_024, land: square(6_000, -12_000, 3_000) },
    ]);
    // Both keep moving every step: 0 runs right, 1 runs down across 0's trail.
    const events = driveTo(s, 0, { x: 12_000, y: 0 });
    const out = events.find((e) => e.type === "out");
    expect(out).toMatchObject({ type: "out", id: 0, reason: "cut", by: 1 });
    expect(s.players[0]!.alive).toBe(false);
    expect(pointInLand(s.players[1]!.land, { x: 0, y: 0 })).toBe(true);
    expect(s.ended).toBe(true);
  });

  it("cuts as soon as a head visibly touches a trail, and not before", () => {
    const { cutReach, headRadius, trailWidth } = TERRITORY_CONFIG;
    expect(cutReach).toBe(headRadius + trailWidth / 2);
    const skimAt = (gap: number) => {
      const s = stateWith([
        { x: 15_000, y: 0, heading: 0, target: 0, land: square(0, 0, 3_000) },
        { x: 8_000, y: -gap, heading: 0, target: 0, land: square(8_000, -20_000, 3_000) },
      ]);
      s.players[0]!.trail = [{ x: 3_000, y: 0 }, { x: 15_000, y: 0 }];
      stepTerritory(s, shape);
      return s.players[0]!.alive;
    };
    expect(skimAt(cutReach + 1)).toBe(true);
    expect(skimAt(cutReach)).toBe(false);
  });

  it("keeps only the part of a sliced land the player is on; the rest vanishes", () => {
    const s = stateWith([
      { x: 0, y: 9_000, heading: 1_024, target: 1_024, land: square(0, 9_000, 3_000) },
      { x: -10_000, y: 0, heading: 0, target: 0, land: rect(-20_000, -2_000, 12_000, 2_000) },
    ]);
    // Player 0 slices straight through the long land and comes home.
    driveWhileOrbiting(s, [{ x: 0, y: -4_000 }, { x: 2_500, y: -4_000 }, { x: 2_500, y: 9_000 }], { x: -10_000, y: 0 });
    const [slicer, victim] = s.players as [TerritoryPlayer, TerritoryPlayer];
    expect(victim.alive).toBe(true);
    expect(pointInLand(slicer.land, { x: 2_000, y: 0 })).toBe(true);
    expect(pointInLand(victim.land, { x: -10_000, y: 0 })).toBe(true);
    // The far part is nobody's now.
    expect(pointInLand(victim.land, { x: 9_000, y: 0 })).toBe(false);
    expect(pointInLand(slicer.land, { x: 9_000, y: 0 })).toBe(false);
  });

  it("knocks out a player whose whole land is taken, credited to the taker", () => {
    const s = stateWith([
      { x: 0, y: 0, heading: 1_024, target: 1_024, land: square(0, 0, 3_000) },
      { x: 0, y: -10_000, heading: 0, target: 0, land: square(0, -10_000, 2_000) },
    ]);
    // A loop around player 1 and all of its land.
    const events = driveWhileOrbiting(
      s,
      [{ x: -5_000, y: -5_000 }, { x: -5_000, y: -15_000 }, { x: 5_000, y: -15_000 }, { x: 5_000, y: -5_000 }, { x: 0, y: 0 }],
      { x: 0, y: -10_000 },
    );
    expect(events.find((e) => e.type === "out")).toMatchObject({ type: "out", id: 1, reason: "land", by: 0 });
    expect(s.ended).toBe(true);
  });

  it("knocks out a player left with only a sliver too thin to stand on", () => {
    // Player 1 is out on a trail that left land it has since lost (so player 0 never touches the trail); player 0's
    // loop takes all of its land but a thin strip on the far side.
    const s = stateWith([
      { x: 0, y: 0, heading: 1_024, target: 1_024, land: square(0, 0, 3_000) },
      { x: 9_000, y: -8_500, heading: 0, target: 0, land: rect(-2_000, -12_000, 2_000, -8_000) },
    ]);
    s.players[1]!.trail = [{ x: 1_400 + TERRITORY_CONFIG.cutReach + 500, y: -8_500 }, { x: 9_000, y: -8_500 }];
    const events = driveWhileOrbiting(
      s,
      [{ x: -3_000, y: -5_000 }, { x: -3_000, y: -13_000 }, { x: 1_400, y: -13_000 }, { x: 1_400, y: -11_500 }, { x: 1_400, y: -5_000 }, { x: 0, y: 0 }],
      { x: 12_000, y: -8_500 },
    );
    expect(events.find((e) => e.type === "out")).toMatchObject({ type: "out", id: 1, reason: "land", by: 0 });
  });

  it("blocks heads meeting head-on: nobody is out and nobody passes", () => {
    const s = stateWith([
      { x: 0, y: 0, heading: 0, target: 0, land: square(-6_000, 0, 3_000) },
      { x: 3_000, y: 0, heading: 2_048, target: 2_048, land: square(9_000, 0, 3_000) },
    ]);
    for (let i = 0; i < 20; i++) stepTerritory(s, shape);
    const [a, b] = s.players as [TerritoryPlayer, TerritoryPlayer];
    expect(a.alive && b.alive).toBe(true);
    expect(b.x - a.x).toBeGreaterThanOrEqual(2 * TERRITORY_CONFIG.headRadius - 2);
  });

  it("ends at the time limit and ranks by land, then by how long players lasted", () => {
    const s = createTerritory([0, 1, 2], RADIUS);
    s.players[2]!.land = square(0, 0, 9_000);
    stepTerritory(s, shape, { quits: [1] });
    while (!s.ended) stepTerritory(s, shape, { targets: new Map([[0, s.players[0]!.heading], [2, s.players[2]!.heading]]) });
    expect(s.tick).toBeLessThanOrEqual(TERRITORY_TICKS.matchTicks);
    const results = rankTerritory(s);
    expect(results.map((r) => r.id)).toEqual([2, 0, 1]);
    expect(results[2]).toMatchObject({ place: 3, quit: true, survivedMs: TERRITORY_CONFIG.tickMs });
  });
});

describe("territory wire format", () => {
  it("round-trips snapshots, full syncs and inputs", () => {
    const s = createTerritory([0, 3], RADIUS);
    s.players[0]!.trail = [{ x: 1, y: -2 }, { x: 300, y: -400 }];
    const snapshot = {
      tick: 42,
      heads: [{ id: 3, outside: true, x: -5, y: 7, heading: 4_095, target: 12, inputSeq: 9, late: 1 }],
      events: [
        { type: "trailStart" as const, id: 3, point: { x: 10, y: -10 } },
        { type: "out" as const, id: 0, reason: "cut" as const, by: 3, lands: [{ id: 3, land: s.players[0]!.land }] },
      ],
    };
    expect(decodeServerMessage(encodeSnapshot(snapshot))).toEqual({ kind: "snapshot", ...snapshot });
    const players = s.players.map((p) => ({ ...p, inputSeq: 2, late: 0 }));
    expect(decodeServerMessage(encodeFullSync({ tick: 5, radius: RADIUS, ended: false, players }))).toEqual({
      kind: "full",
      tick: 5,
      radius: RADIUS,
      ended: false,
      players,
    });
    const input = { kind: "input" as const, seq: 7, tick: 99, target: 2_000 };
    expect(decodeClientMessage(encodeClientMessage(input))).toEqual(input);
    expect(decodeClientMessage(new Uint8Array([0x11, 1, 2]))).toBeNull();
    expect(decodeClientMessage(encodeClientMessage({ ...input, target: 5_000 }))).toBeNull();
  });

  it("keeps a whole arena's land small enough to send", () => {
    expect(arenaPolygon(RADIUS)[0]!.length).toBe(TERRITORY_CONFIG.arenaVertices);
  });
});
