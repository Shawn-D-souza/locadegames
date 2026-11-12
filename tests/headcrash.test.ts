import { describe, expect, it } from "vitest";
import { BUTTON_LEFT, BUTTON_RIGHT, HEADCRASH_CONFIG } from "../src/shared/games/headcrash/config";
import { layoutFor, mapLayout, restSink, rideHeight } from "../src/shared/games/headcrash/layout";
import { MAPS } from "../src/shared/games/headcrash/maps";
import { CAR_DISCS, findHit, headOf, stepCars, WALL_DEPTH, wheelSink, type StepReport } from "../src/shared/games/headcrash/physics";
import { seededRandom } from "../src/shared/games/headcrash/random";
import { cloneHeadCrash, createHeadCrash, layoutOf, outcomeOf, scorerOf, stepHeadCrash, waterLevel, waterOf } from "../src/shared/games/headcrash/simulation";
import { HIT_CAUSE, PHASE, type Car, type HeadCrashState, type Layout, type Motion } from "../src/shared/games/headcrash/types";
import { decodeClientMessage, decodeServerMessage, encodeClientMessage, encodeSnapshot } from "../src/shared/games/headcrash/wire";
import { HeadCrashDuel } from "../src/server/duel/headCrashDuel";

const C = HEADCRASH_CONFIG;
const DT = 1 / C.tickRate;
const SEEDS = [1, 2, 3, 99, 12_345];

const everyLayout = (): Layout[] => MAPS.map((m) => mapLayout(m.name));

/** A match already past its countdown. */
function playing(seed = 5, round = 0): HeadCrashState {
  const state = createHeadCrash(seed, round);
  while (state.phase === PHASE.countdown) stepHeadCrash(state, [0, 0]);
  return state;
}

/** The bowl: a flat floor at y = 0 and no planks, so tests can place cars freely. */
function plainArena(): { seed: number; round: number; layout: Layout } {
  for (let round = 0; round < MAPS.length; round++) {
    const layout = layoutFor(7, round);
    if (layout.name === "bowl") return { seed: 7, round, layout };
  }
  throw new Error("no bowl");
}

const carAt = (x: number, y: number, angle = 0): Car => ({ x, y, angle, vx: 0, vy: 0, spin: 0 });

describe("Head Crash arenas", () => {
  it("are closed and the same on both halves, with the air on the left of every outline", () => {
    const mirrorOf = (p: { x: number; y: number }, points: readonly { x: number; y: number }[]) =>
      points.some((q) => Math.abs(q.x + p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9);
    for (const layout of everyLayout()) {
      const points = layout.outlines.flat();
      expect(points.length).toBeGreaterThan(20);
      for (const p of points) expect(mirrorOf(p, points)).toBe(true);
      for (const b of layout.blocks) expect(layout.blocks.some((o) => Math.abs(o.x + b.x) < 1e-9 && Math.abs(o.y - b.y) < 1e-9 && Math.abs(o.angle + b.angle) < 1e-9)).toBe(true);
      for (const e of layout.edges) expect(e.length).toBeGreaterThan(1e-3);
      // Lifts and fans too.
      for (const l of layout.lifts) expect(layout.lifts.some((o) => Math.abs(o.x + l.x) < 1e-9 && o.low === l.low && o.high === l.high)).toBe(true);
      for (const f of layout.fans) expect(layout.fans.some((o) => Math.abs(o.minX + f.maxX) < 1e-9 && Math.abs(o.maxX + f.minX) < 1e-9 && o.minY === f.minY)).toBe(true);
      // The first outline of a cave holds its play space; the frame's middle line has air somewhere.
      expect(layout.cave).toBe(MAPS.find((m) => m.name === layout.name)!.cave);
    }
  });

  it("start the cars at opposite ends, mirrored, on their wheels and touching nothing", () => {
    for (const layout of everyLayout()) {
      const [left, right] = layout.spawns;
      expect(left.x).toBeLessThan(-3);
      // Above the water, on the screen, clear of the corners the drive buttons sit in.
      expect(left.y).toBeGreaterThan(layout.floorY + C.water.startDepth + 2);
      expect(left.x).toBeGreaterThan(layout.minX + 2);
      expect(right.x).toBeCloseTo(-left.x, 9);
      expect(right.y).toBeCloseTo(left.y, 9);
      expect(right.angle).toBeCloseTo(-left.angle, 9);
      expect(findHit([left, right], layout, layout.floorY - 1)).toBeNull();
      // Standing still on the start for a second: the car has not sunk into or fallen off the floor.
      const cars: [Car, Car] = [{ ...left }, { ...right }];
      const flat = Math.abs(left.angle) < 1e-6;
      for (let i = 0; i < 60; i++) stepCars(cars, [0, 0], layout, DT);
      if (flat) {
        expect(Math.abs(cars[0].y - left.y)).toBeLessThan(0.03);
        expect(Math.abs(cars[0].x - left.x)).toBeLessThan(0.03);
      }
      expect(findHit(cars, layout, layout.floorY - 1)).toBeNull();
    }
  });

  it("are thick enough everywhere that a wheel squeezed all the way never feels the ground's underside", () => {
    // A wheel's middle sits (radius − travel) above the ground at most squeeze; the underside must stay further
    // than WALL_DEPTH from it, or it pulls the wheel down (a car stuck in a thin bridge's dip).
    const thinnest = WALL_DEPTH - (C.car.wheelRadius - C.suspension.travel);
    for (const layout of everyLayout()) {
      for (const top of layout.edges) {
        if (top.ny < 0.5) continue;
        const x = top.ax + (top.dx * top.length) / 2;
        const y = top.ay + (top.dy * top.length) / 2;
        // Straight down into the ground from the middle of this piece, to the first underside it meets (ground buried
        // under other ground, like the floor under a bounce pad, faces up and pulls nothing down).
        let thickness = Infinity;
        for (const e of layout.edges) {
          if (e === top || e.nx * top.nx + e.ny * top.ny > 0) continue;
          const across = -top.nx * e.dy + top.ny * e.dx;
          if (Math.abs(across) < 1e-9) continue;
          const depth = ((e.ax - x) * e.dy - (e.ay - y) * e.dx) / across;
          const along = ((e.ax - x) * -top.ny - (e.ay - y) * -top.nx) / across;
          if (depth > 1e-6 && along >= 0 && along <= e.length && depth < thickness) thickness = depth;
        }
        expect(thickness, `${layout.name} at (${x.toFixed(2)}, ${y.toFixed(2)})`).toBeGreaterThan(thinnest + 0.1);
      }
    }
  });

  it("come in a shuffled order per match, each once before any comes back", () => {
    for (const seed of SEEDS) {
      const names = Array.from({ length: MAPS.length }, (_, round) => layoutFor(seed, round).name);
      expect(new Set(names).size).toBe(MAPS.length);
      expect(layoutFor(seed, MAPS.length).name).toBe(names[0]);
    }
    const firsts = new Set(SEEDS.map((seed) => layoutFor(seed, 0).name));
    expect(firsts.size).toBeGreaterThan(1);
    expect(layoutFor(42, 3)).toBe(layoutFor(42, 3));
  });

  it("keep a car's height above the ground in step with its wheels on their springs", () => {
    expect(rideHeight()).toBeCloseTo(C.car.wheelRadius - C.car.wheelY - restSink(), 9);
    expect(restSink()).toBeGreaterThan(0);
    expect(restSink()).toBeLessThan(C.suspension.travel);
    expect(CAR_DISCS.filter((d) => d.wheel)).toHaveLength(2);
  });
});

describe("Head Crash driving", () => {
  it("does nothing during the countdown, then drives the way the button says", () => {
    const state = createHeadCrash(plainArena().seed, plainArena().round);
    const start = state.cars[0].x;
    for (let i = 0; i < C.firstCountdownTicks - 1; i++) stepHeadCrash(state, [BUTTON_RIGHT, 0]);
    expect(state.phase).toBe(PHASE.countdown);
    expect(state.cars[0].x).toBe(start);
    for (let i = 0; i < 31; i++) stepHeadCrash(state, [BUTTON_RIGHT, BUTTON_LEFT]);
    expect(state.phase).toBe(PHASE.play);
    expect(state.cars[0].x).toBeGreaterThan(start + 2);
    expect(state.cars[1].x).toBeLessThan(-start - 2);
    // Mirrored buttons in a mirrored arena: the cars stay mirror images (to a hair: the solver goes round the
    // wheels in one fixed order, rear first for one car and front first for the other).
    expect(state.cars[1].x).toBeCloseTo(-state.cars[0].x, 2);
    expect(state.cars[1].y).toBeCloseTo(state.cars[0].y, 2);
    expect(state.cars[1].angle).toBeCloseTo(-state.cars[0].angle, 2);
  });

  it("never drives faster than its top speed on the flat, and rolls to a stop with no button", () => {
    const { seed, round } = plainArena();
    const state = playing(seed, round);
    let fastest = 0;
    for (let i = 0; i < 40; i++) {
      stepHeadCrash(state, [BUTTON_RIGHT, 0]);
      fastest = Math.max(fastest, state.cars[0].vx);
    }
    expect(fastest).toBeGreaterThan(C.drive.maxSpeed * 0.9);
    // The wheels hold the top speed; the body rocking over them on its springs may swing a touch past it.
    expect(fastest).toBeLessThanOrEqual(C.drive.maxSpeed * 1.02);
    // Both buttons cancel out, like none.
    const both = cloneHeadCrash(state);
    stepHeadCrash(both, [BUTTON_LEFT | BUTTON_RIGHT, 0]);
    stepHeadCrash(state, [0, 0]);
    expect(both.cars[0]).toEqual(state.cars[0]);
  });

  it("settles on its springs at its ride height, level, wheels pushed up by its weight", () => {
    const { layout } = plainArena();
    const rest = layout.spawns[0];
    const cars: [Car, Car] = [carAt(rest.x, rest.y + 0.4), carAt(-rest.x, rest.y + 0.4)];
    for (let i = 0; i < 3 * C.tickRate; i++) stepCars(cars, [0, 0], layout, DT);
    expect(cars[0].y).toBeCloseTo(rest.y, 2);
    expect(Math.abs(cars[0].angle)).toBeLessThan(0.01);
    for (const sink of wheelSink(cars[0], layout)) expect(sink).toBeCloseTo(restSink(), 2);
  });

  it("bounces on its springs when it lands, then settles", () => {
    const { layout } = plainArena();
    const rest = layout.spawns[0];
    const cars: [Car, Car] = [carAt(rest.x, rest.y + 3), carAt(-rest.x, rest.y + 3)];
    let lowest = Infinity;
    let after = -Infinity;
    for (let i = 0; i < 2 * C.tickRate; i++) {
      stepCars(cars, [0, 0], layout, DT);
      if (cars[0].y < lowest) [lowest, after] = [cars[0].y, -Infinity];
      after = Math.max(after, cars[0].y);
    }
    // Squeezed well past where it rests, then thrown back up past it.
    expect(lowest).toBeLessThan(rest.y - 0.1);
    expect(after).toBeGreaterThan(rest.y);
    expect(cars[0].y).toBeCloseTo(rest.y, 2);
    expect(findHit(cars, layout, -20)).toBeNull();
  });

  it("lifts on the ground with the buttons: a wheelie setting off (never past its limit), the nose down braking, back on its wheels when let go", () => {
    const { layout } = plainArena();
    const rest = layout.spawns[0];
    const cars: [Car, Car] = [carAt(-8, rest.y), carAt(0, 40)];
    const run = (button: number, seconds: number, watch: (angle: number) => void) => {
      for (let i = 0; i < seconds * C.tickRate; i++) {
        stepCars(cars, [button, 0], layout, DT);
        cars[1] = carAt(0, 40);
        watch(cars[0].angle);
      }
    };
    let up = 0;
    let down = 0;
    run(BUTTON_RIGHT, 0.5, (a) => (up = Math.max(up, a)));
    run(BUTTON_LEFT, 0.4, (a) => (down = Math.min(down, a)));
    expect(up).toBeGreaterThan(0.15);
    expect(up).toBeLessThan(C.drive.tiltMax + 0.1);
    expect(down).toBeLessThan(-0.08);
    run(0, 1.5, () => undefined);
    expect(Math.abs(cars[0].angle)).toBeLessThan(0.05);
    expect(findHit(cars, layout, -20)).toBeNull();
  });

  it("rides on its wheels at top speed: the lift is for setting off", () => {
    const { layout } = plainArena();
    const rest = layout.spawns[0];
    const cars: [Car, Car] = [carAt(-12, rest.y), carAt(0, 40)];
    for (let i = 0; i < C.tickRate; i++) {
      stepCars(cars, [BUTTON_RIGHT, 0], layout, DT);
      cars[1] = carAt(0, 40);
    }
    expect(cars[0].vx).toBeGreaterThan(C.drive.maxSpeed * 0.9);
    // Only the small lean of the tyres' push is left.
    expect(Math.abs(cars[0].angle)).toBeLessThan(0.2);
  });

  it("drives off its start toward the other car on every map", () => {
    for (const layout of everyLayout()) {
      const start = layout.spawns[1];
      const cars: [Car, Car] = [{ ...layout.spawns[0], y: 40 }, { ...start }];
      for (let i = 0; i < C.tickRate; i++) {
        stepCars(cars, [0, BUTTON_LEFT], layout, DT);
        cars[0] = { ...layout.spawns[0], y: 40 };
      }
      // Ice is slow to get going.
      expect(start.x - cars[1].x, layout.name).toBeGreaterThan(1.5);
    }
  });

  describe("on the maps that play differently, what makes them different can be used", () => {
    /**
     * Car 1 on its own (car 0 parked far above), from `start`, holding `button` until `letGo` says so; the lifts move
     * as in a round. `watch` sees it after every step.
     */
    const drive = (layout: Layout, start: Car, button: number, seconds: number, watch: (car: Car) => void = () => {}, letGo: (car: Car) => boolean = () => false) => {
      const parked = { ...layout.spawns[0], y: 60 };
      const cars: [Car, Car] = [{ ...parked }, { ...start }];
      const motion: Motion = { playTicks: 0 };
      let held = button;
      for (let i = 0; i < seconds * C.tickRate; i++) {
        motion.playTicks = i + 1;
        if (letGo(cars[1])) held = 0;
        stepCars(cars, [0, held], layout, DT, undefined, motion);
        cars[0] = { ...parked };
        watch(cars[1]);
      }
      return { car: cars[1] };
    };

    it("trampoline: driving over the pad from the start throws the car high", () => {
      const layout = mapLayout("trampoline");
      let highest = -Infinity;
      drive(layout, layout.spawns[1], BUTTON_LEFT, 2.5, (car) => (highest = Math.max(highest, car.y)));
      expect(highest).toBeGreaterThan(5);
    });

    it("two floors: a car on the bottom floor drives over the pad and up onto the top floor", () => {
      const layout = mapLayout("floors");
      const deckTop = 4 * C.arena.mapScale;
      for (const [x, button] of [[-10, BUTTON_RIGHT], [10, BUTTON_LEFT]] as const) {
        const { car } = drive(layout, carAt(x, rideHeight()), button, 3, undefined, (c) => c.vy > C.surfaces.padLaunch / 2);
        expect(car.y, `from x = ${x}`).toBeGreaterThan(deckTop);
        expect(Math.abs(car.x)).toBeGreaterThan(4);
        expect(Math.abs(car.angle), "on its wheels").toBeLessThan(0.6);
      }
      // And the top floor is where the cars start.
      expect(layout.spawns[1].y).toBeGreaterThan(deckTop);
    });

    it("fan: its air lifts a car and holds it up, and the buttons steer it there", () => {
      const layout = mapLayout("fan");
      const { car } = drive(layout, carAt(0, rideHeight()), 0, 4);
      expect(car.y).toBeGreaterThan(4);
      expect(car.y).toBeLessThan(layout.topY - 1);
      expect(Math.abs(car.vy)).toBeLessThan(1.5);
      const { car: steered } = drive(layout, car, BUTTON_LEFT, 0.5);
      expect(steered.x).toBeLessThan(car.x - 0.5);
    });

    it("lift: a car standing on it rides up", () => {
      const layout = mapLayout("lift");
      let highest = -Infinity;
      drive(layout, carAt(0, rideHeight()), 0, C.gadgets.liftWait + C.gadgets.liftMove + 0.5, (c) => (highest = Math.max(highest, c.y)));
      expect(highest).toBeGreaterThan(5);
    });
  });

  it("reports what the sounds need: a pad's throw, a fan's air, and the body (not the wheels) knocking the rock", () => {
    const report: StepReport = { grounded: [false, false], impact: [0, 0], carsTouched: false, knock: [0, 0], padThrow: [false, false], inFan: [false, false] };
    /** Car 1 alone for `seconds`; returns whether `seen` held after any step. */
    const watch = (layout: Layout, start: Car, button: number, seconds: number, seen: () => boolean) => {
      const parked = { ...layout.spawns[0], y: 60 };
      const cars: [Car, Car] = [{ ...parked }, { ...start }];
      let any = false;
      for (let i = 0; i < seconds * C.tickRate; i++) {
        stepCars(cars, [0, button], layout, DT, report, { playTicks: i + 1 });
        cars[0] = { ...parked };
        any ||= seen();
      }
      return any;
    };
    const trampoline = mapLayout("trampoline");
    expect(watch(trampoline, trampoline.spawns[1], BUTTON_LEFT, 2.5, () => report.padThrow[1])).toBe(true);
    const fan = mapLayout("fan");
    expect(watch(fan, carAt(0, rideHeight()), 0, 0.5, () => report.inFan[1])).toBe(true);
    const { layout: bowl } = plainArena();
    expect(watch(bowl, carAt(-8, rideHeight()), 0, 1, () => report.padThrow[1] || report.inFan[1])).toBe(false);
    // Driving and landing on its wheels is never a knock; falling on its back is.
    let hardest = 0;
    watch(bowl, { ...carAt(-8, 3), vy: -6 }, BUTTON_RIGHT, 1, () => ((hardest = Math.max(hardest, report.knock[1])), false));
    expect(hardest).toBe(0);
    expect(watch(bowl, { ...carAt(-8, 3, Math.PI), vy: -6 }, 0, 1, () => report.knock[1] > 3)).toBe(true);
  });

  it("never flips itself over on the flat, however its buttons are mashed", () => {
    const { layout } = plainArena();
    const rest = layout.spawns[0];
    const random = seededRandom(7);
    let worst = 0;
    for (let run = 0; run < 20; run++) {
      const cars: [Car, Car] = [carAt(0, rest.y), carAt(0, 40)];
      for (let t = 0; t < 8 * C.tickRate; ) {
        // A button held for a random moment, the car kept away from the walls.
        const button = cars[0].x > 4 ? BUTTON_LEFT : cars[0].x < -4 ? BUTTON_RIGHT : random() < 0.5 ? BUTTON_LEFT : BUTTON_RIGHT;
        const hold = 6 + Math.floor(random() * 42);
        for (let i = 0; i < hold; i++, t++) {
          stepCars(cars, [button, 0], layout, DT);
          // The other car is kept out of the way.
          cars[1] = carAt(0, 40);
          worst = Math.max(worst, Math.abs(cars[0].angle));
        }
      }
    }
    expect(worst).toBeLessThan(Math.PI / 2);
  });

  it("turns in the air: the right button counter-clockwise, the left clockwise", () => {
    const { layout } = plainArena();
    const cars: [Car, Car] = [carAt(-4, 7), carAt(4, 7)];
    for (let i = 0; i < 10; i++) stepCars(cars, [BUTTON_RIGHT, BUTTON_LEFT], layout, DT);
    expect(cars[0].angle).toBeGreaterThan(0.05);
    expect(cars[1].angle).toBeCloseTo(-cars[0].angle, 9);
    expect(Math.abs(cars[0].spin)).toBeLessThanOrEqual(C.air.maxSpin + 1e-9);
  });

  it("keeps cars in the world, whatever they do: never inside the ground or lost off the screen", () => {
    for (const seed of SEEDS) {
      const state = createHeadCrash(seed);
      let escaped: string | null = null;
      for (let i = 0; i < 6_000 && !escaped; i++) {
        // A crude pattern of button mashing, different for each car.
        stepHeadCrash(state, [(i >> 5) % 3, ((i >> 6) + 1) % 3]);
        const layout = layoutOf(state);
        for (const car of state.cars) {
          const near = car.x > layout.minX - 12 && car.x < layout.maxX + 12 && car.y > layout.floorY - 3 && car.y < layout.topY + 12;
          if (!near || !Number.isFinite(car.x + car.y + car.angle + car.vx + car.vy + car.spin)) escaped = `${layout.name} seed ${seed} step ${i}: ${JSON.stringify(car)}`;
        }
      }
      expect(escaped).toBeNull();
    }
  });

  it("is the same every time for the same buttons", () => {
    const run = () => {
      const state = createHeadCrash(11);
      for (let i = 0; i < 2_000; i++) stepHeadCrash(state, [(i >> 4) % 3, (i >> 5) % 3]);
      return state;
    };
    expect(run()).toEqual(run());
  });
});

describe("Head Crash hits", () => {
  const { seed, round, layout } = plainArena();
  const ground = rideHeight();
  const dry = layout.floorY - 1;

  it("a car landing on the other's head scores", () => {
    const victim = carAt(0, ground);
    const head = headOf(victim);
    // The attacker's wheel just reaches the victim's head from above.
    const attacker = carAt(C.car.wheelX, head.y + C.car.headRadius + C.car.wheelRadius - C.car.wheelY - 0.05);
    const hit = findHit([attacker, victim], layout, dry)!;
    expect(hit.victims).toEqual([false, true]);
    expect(hit.cause).toBe(HIT_CAUSE.car);
    expect(scorerOf(hit.victims)).toBe(0);
    expect(Math.hypot(hit.x - head.x, hit.y - head.y)).toBeCloseTo(C.car.headRadius, 6);
  });

  it("cars side by side on the ground don't hit heads", () => {
    const apart = 2 * (C.car.bodyX + C.car.bodyRadius);
    expect(findHit([carAt(-apart / 2, ground), carAt(apart / 2, ground)], layout, dry)).toBeNull();
  });

  it("a head on the floor gives the other car the point", () => {
    const upsideDown = carAt(-3, C.car.headY + C.car.headRadius - 0.05, Math.PI);
    const hit = findHit([upsideDown, carAt(5, ground)], layout, dry)!;
    expect(hit.victims).toEqual([true, false]);
    expect(hit.cause).toBe(HIT_CAUSE.arena);
    expect(scorerOf(hit.victims)).toBe(1);
  });

  it("two heads meeting is nobody's point", () => {
    const hit = findHit([carAt(-0.3, 6, -Math.PI / 2), carAt(0.3 + 2 * C.car.headY, 6, Math.PI / 2)], layout, dry)!;
    expect(hit.victims).toEqual([true, true]);
    expect(scorerOf(hit.victims)).toBeNull();
  });

  it("water over a head is a hit", () => {
    const low = carAt(-4, ground);
    const high = carAt(4, ground + 3);
    const hit = findHit([low, high], layout, headOf(low).y + 0.01)!;
    expect(hit.victims).toEqual([true, false]);
    expect(hit.cause).toBe(HIT_CAUSE.water);
  });

  it("a point pauses the round, then the next one starts in a new arena with the cars back on their starts", () => {
    const state = playing(seed, round);
    state.cars[0] = carAt(-3, C.car.headY + C.car.headRadius - 0.05, Math.PI);
    stepHeadCrash(state, [0, 0]);
    expect(state.phase).toBe(PHASE.hit);
    expect(state.score).toEqual([0, 1]);
    expect(state.hit?.victims).toEqual([true, false]);
    const frozen = { ...state.cars[1] };
    for (let i = 0; i < C.hitPauseTicks - 1; i++) stepHeadCrash(state, [BUTTON_LEFT, BUTTON_LEFT]);
    expect(state.phase).toBe(PHASE.hit);
    expect(state.cars[1]).toEqual(frozen);
    stepHeadCrash(state, [0, 0]);
    expect(state.phase).toBe(PHASE.countdown);
    expect(state.round).toBe(round + 1);
    expect(state.phaseTicks).toBe(C.countdownTicks);
    expect(state.hit).toBeNull();
    expect(state.cars).toEqual(layoutFor(seed, round + 1).spawns);
  });

  it("the first to 5 points wins and the match stops", () => {
    const state = playing(seed, round);
    state.score = [C.pointsToWin - 1, 2];
    state.cars[1] = carAt(3, C.car.headY + C.car.headRadius - 0.05, Math.PI);
    stepHeadCrash(state, [0, 0]);
    expect(state.phase).toBe(PHASE.over);
    expect(state.score).toEqual([C.pointsToWin, 2]);
    expect(outcomeOf(state)).toEqual({ kind: "win", seat: 0 });
    const done = cloneHeadCrash(state);
    for (let i = 0; i < 300; i++) stepHeadCrash(state, [BUTTON_LEFT, BUTTON_RIGHT]);
    expect(state).toEqual(done);
  });

  it("the water rises after a while, ends a round nobody plays, and three such rounds end the match as it stands", () => {
    const { water } = C;
    expect(waterLevel(layout, 0)).toBeCloseTo(layout.floorY + water.startDepth);
    expect(waterLevel(layout, water.startTicks)).toBeCloseTo(layout.floorY + water.startDepth);
    expect(waterLevel(layout, water.startTicks + water.riseTicks)).toBeGreaterThan(layout.topY);

    const state = createHeadCrash(3);
    state.score = [2, 1];
    let steps = 0;
    while (state.phase !== PHASE.over && steps++ < 200_000) stepHeadCrash(state, [0, 0]);
    expect(state.phase).toBe(PHASE.over);
    expect(state.deadRounds).toBe(C.maxDeadRounds);
    expect(state.round).toBe(C.maxDeadRounds - 1);
    expect(state.score).toEqual([2, 1]);
    expect(outcomeOf(state)).toEqual({ kind: "win", seat: 0 });
    expect(state.hit?.cause).toBe(HIT_CAUSE.water);
    expect(waterOf(state)).toBe(state.hit?.waterY);
    expect(outcomeOf({ ...state, score: [1, 1] })).toEqual({ kind: "draw" });
  });
});

describe("Head Crash wire", () => {
  it("carries the whole match in a small snapshot", () => {
    const state = playing(9);
    for (let i = 0; i < 90; i++) stepHeadCrash(state, [BUTTON_RIGHT, BUTTON_LEFT]);
    state.score = [3, 4];
    state.hit = { victims: [false, true], cause: HIT_CAUSE.arena, x: 1.5, y: 2.5, waterY: 0.25, playTicks: 321 };
    state.phase = PHASE.hit;
    const bytes = encodeSnapshot({ matchId: 6, tickZeroAt: 1_731_000_000_123.5, state, inputSeq: [7, 65_535], late: [1, 255], pending: [{ seat: 1, tick: state.tick + 3, buttons: BUTTON_LEFT }] });
    expect(bytes.byteLength).toBeLessThan(110);
    const msg = decodeServerMessage(bytes);
    if (msg?.kind !== "snapshot") throw new Error("not a snapshot");
    expect(msg.matchId).toBe(6);
    expect(msg.tickZeroAt).toBe(1_731_000_000_123.5);
    expect(msg.inputSeq).toEqual([7, 65_535]);
    expect(msg.late).toEqual([1, 255]);
    expect(msg.pending).toEqual([{ seat: 1, tick: state.tick + 3, buttons: BUTTON_LEFT }]);
    const { cars, ...rest } = msg.state;
    const { cars: sentCars, ...sent } = state;
    expect({ ...rest, seed: state.seed }).toEqual(sent);
    for (const seat of [0, 1] as const) {
      for (const key of ["x", "y", "angle", "vx", "vy", "spin"] as const) expect(cars[seat][key]).toBeCloseTo(sentCars[seat][key], 4);
    }
  });

  it("refuses broken or oversized client frames", () => {
    const input = encodeClientMessage({ kind: "input", matchId: 3, seq: 9, tick: 1_000, buttons: BUTTON_RIGHT });
    expect(decodeClientMessage(input)).toEqual({ kind: "input", matchId: 3, seq: 9, tick: 1_000, buttons: BUTTON_RIGHT });
    expect(decodeClientMessage(encodeClientMessage({ kind: "watch", matchId: 300 }))).toEqual({ kind: "watch", matchId: 300 });
    expect(decodeClientMessage(encodeClientMessage({ kind: "ping", clientTime: 12.5 }))).toEqual({ kind: "ping", clientTime: 12.5 });
    expect(decodeClientMessage(input.slice(0, input.length - 1))).toBeNull();
    expect(decodeClientMessage(new Uint8Array([...input, 0]))).toBeNull();
    const badButtons = new Uint8Array(input);
    badButtons[badButtons.length - 1] = 7;
    expect(decodeClientMessage(badButtons)).toBeNull();
    expect(decodeClientMessage(new Uint8Array([0x11, 0, 0]))).toBeNull();
  });
});

describe("Head Crash on the server", () => {
  const tick = C.tickMs;

  it("steps on the clock, sends a snapshot every other step, and applies buttons on the step they were sent for", () => {
    const duel = new HeadCrashDuel(1, 5, [0, 0], 1_000);
    expect(duel.advance(999)).toBe(false);
    expect(duel.advance(1_000 + tick * 1.5)).toBe(true);
    expect(duel.state.tick).toBe(1);
    duel.snapshot();
    expect(duel.advance(1_000 + tick * 2.5)).toBe(false);
    expect(duel.advance(1_000 + tick * 3.5)).toBe(true);
    duel.snapshot();

    duel.input(0, 1, 10, BUTTON_RIGHT);
    duel.advance(1_000 + tick * 9.5);
    expect(duel.state.buttons).toEqual([0, 0]);
    const waiting = decodeServerMessage(duel.snapshot());
    expect(waiting?.kind === "snapshot" && waiting.pending).toEqual([{ seat: 0, tick: 10, buttons: BUTTON_RIGHT }]);
    duel.advance(1_000 + tick * 10.5);
    expect(duel.state.buttons).toEqual([BUTTON_RIGHT, 0]);
    const applied = decodeServerMessage(duel.snapshot());
    expect(applied?.kind === "snapshot" && [applied.inputSeq, applied.late, applied.pending]).toEqual([[1, 0], [0, 0], []]);

    // Too late for its step: applied on the next one, and counted. An old sequence number is ignored.
    duel.input(0, 2, 5, 0);
    duel.input(0, 2, 5, BUTTON_LEFT);
    duel.advance(1_000 + tick * 11.5);
    const late = decodeServerMessage(duel.snapshot());
    expect(late?.kind === "snapshot" && [late.state.buttons, late.inputSeq, late.late]).toEqual([[0, 0], [2, 0], [1, 0]]);
  });

  it("skips time after a long stall instead of racing through it", () => {
    const duel = new HeadCrashDuel(1, 5, [0, 0], 0);
    duel.advance(60_000);
    expect(duel.state.tick).toBeLessThan(100);
    expect(duel.tickZeroAt).toBeGreaterThan(50_000);
  });

  it("picks a lost match up from its score, on a fresh round", () => {
    const duel = new HeadCrashDuel(1, 5, [3, 2], 0);
    expect(duel.state.score).toEqual([3, 2]);
    expect(duel.state.round).toBe(5);
    expect(duel.state.phase).toBe(PHASE.countdown);
  });
});
