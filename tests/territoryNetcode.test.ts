import { describe, expect, it } from "vitest";
import { TerritoryMatch } from "../src/server/arena/territoryMatch";
import { headLimit } from "../src/shared/games/territory/arena";
import { TERRITORY_CONFIG } from "../src/shared/games/territory/config";
import { decodeServerMessage, type FullSync, type Snapshot } from "../src/shared/games/territory/wire";
import { OwnPredictor } from "../src/web/games/territory/engine/prediction";
import { currentTrail, latestLand, Replica } from "../src/web/games/territory/engine/replica";

const RADIUS = 40_000;
const { tickMs } = TERRITORY_CONFIG;

/** A server match plus a client replica fed by its encoded snapshots, step by step. */
function setup() {
  const match = new TerritoryMatch([0, 1], RADIUS, 0);
  const replica = new Replica();
  replica.applyFull(decodeServerMessage(match.fullSync()) as FullSync);
  // One step at a time, like the server loop (a big jump would count as a stall and skip time).
  const run = (steps: number) => {
    for (let i = 0; i < steps; i++) {
      for (const frame of match.advance((match.state.tick + 1) * tickMs)) {
        expect(replica.applySnapshot(decodeServerMessage(frame) as Snapshot)).toBe(true);
      }
    }
  };
  return { match, replica, run };
}

describe("territory client replica", () => {
  it("rebuilds trails and land exactly from the snapshot stream", () => {
    const { match, replica, run } = setup();
    match.input(0, 1, 1, 1_024); // Player 0 turns down, out of its land.
    run(30);
    const server = match.state.players[0]!;
    const copy = replica.players.get(0)!;
    expect(server.trail.length).toBeGreaterThan(2);
    expect(currentTrail(copy)!.points.map(({ x, y }) => ({ x, y }))).toEqual(server.trail);
    match.input(0, 2, 31, 3_072); // Back up, home.
    run(40);
    expect(server.trail).toEqual([]);
    expect(currentTrail(copy)).toBeNull();
    expect(latestLand(copy).land).toEqual(server.land);
  });

  it("asks for a full sync when a step is missing", () => {
    const { match, replica } = setup();
    const frames = match.advance(3 * tickMs);
    expect(replica.applySnapshot(decodeServerMessage(frames[1]!) as Snapshot)).toBe(false);
  });
});

describe("territory own-head prediction", () => {
  it("lands exactly where the server puts the head, steering included", () => {
    const { match, replica, run } = setup();
    run(5);
    const predictor = new OwnPredictor();
    // The client steers for step 8 and predicts 6 steps ahead of what the server has sent.
    const input = predictor.nextInput(8, 1_500);
    match.input(0, input.seq, input.tick, input.target);
    const prediction = predictor.predict(replica.players.get(0)!, replica.tick, replica.tick + 6, headLimit(RADIUS))!;
    run(6);
    const server = match.state.players[0]!;
    const predicted = prediction.steps[prediction.steps.length - 1]!;
    expect({ x: predicted.x, y: predicted.y, heading: predicted.heading }).toEqual({ x: server.x, y: server.y, heading: server.heading });
  });

  it("predicts the trail start on the land's exact edge and the homecoming", () => {
    const { match, replica, run } = setup();
    const predictor = new OwnPredictor();
    const out = predictor.nextInput(1, 1_024);
    match.input(0, out.seq, out.tick, out.target);
    const back = predictor.nextInput(25, 3_072);
    match.input(0, back.seq, back.tick, back.target);
    const prediction = predictor.predict(replica.players.get(0)!, 0, 80, headLimit(RADIUS))!;
    run(80);
    // The server's first trip out ended on the same step, from the same exit point on the land's edge.
    const firstTrip = replica.players.get(0)!.trails[0]!;
    expect(prediction.capture?.tick).toBe(firstTrip.endTick);
    expect(prediction.capture!.trail).toEqual(firstTrip.points.map(({ x, y }) => ({ x, y })));
  });

  it("stops against another head exactly where the server stops it", () => {
    const match = new TerritoryMatch([0, 1], RADIUS, 0);
    // Two heads in open ground, racing at each other.
    Object.assign(match.state.players[0]!, { x: -3_000, y: 0, heading: 0, target: 0 });
    Object.assign(match.state.players[1]!, { x: 3_000, y: 0, heading: 2_048, target: 2_048 });
    const replica = new Replica();
    replica.applyFull(decodeServerMessage(match.fullSync()) as FullSync);
    const predictor = new OwnPredictor();
    const everyone = [...replica.players.values()];
    const prediction = predictor.predict(replica.players.get(0)!, replica.tick, replica.tick + 12, headLimit(RADIUS), everyone)!;
    for (let i = 0; i < 12; i++) match.advance((match.state.tick + 1) * tickMs);
    const [a, b] = match.state.players;
    expect(b!.x - a!.x).toBeGreaterThanOrEqual(2 * TERRITORY_CONFIG.headRadius - 2);
    const predicted = prediction.steps[prediction.steps.length - 1]!;
    expect({ x: predicted.x, y: predicted.y }).toEqual({ x: a!.x, y: a!.y });
  });
});
