import { difference, FillRule } from "clipper2-ts";
import type { Arena } from "../../../src/shared/arena/types";
import { arenaRadiusFor, spawnPoint } from "../../../src/shared/games/territory/arena";
import { TERRITORY_CONFIG } from "../../../src/shared/games/territory/config";
import { landArea } from "../../../src/shared/games/territory/geometry";
import { angleOf } from "../../../src/shared/games/territory/movement";
import { landShare, rankTerritory } from "../../../src/shared/games/territory/ranking";
import { arenaShape, createTerritory, stepTerritory } from "../../../src/shared/games/territory/simulation";
import type { Land, Point, TerritoryState } from "../../../src/shared/games/territory/types";
import type { PlayerId } from "../../../src/shared/rooms/types";
import { FRIENDS } from "../cast";

/**
 * The four friends' Territory match, made with the game's own simulation (no server), steered along loops so the
 * first captures land on the music's beats and Ana ends with the most land. Deterministic: built once, the same on
 * every render. Times here are steps of the simulation (20 a second) from the match's start (GO).
 */

const IDS: PlayerId[] = FRIENDS.map((_, id) => id);
const RADIUS = arenaRadiusFor(IDS.length);
const SHAPE = arenaShape(RADIUS);
export const ARENA_AREA = landArea(SHAPE.arena);
export const STEPS_PER_SECOND = TERRITORY_CONFIG.tickRate;

/** A loop out of your land and back: how far out, how far along the ring (signed: which way), in world units. */
interface Loop {
  out: number;
  along: number;
}

/**
 * Each friend's loops. The first is sized (below) so its capture lands on a beat after GO: Ben, Mia, Ana, then Leo.
 * Ana's second loop is the big one that wins her the match.
 */
const FIRST_CAPTURE_STEP = [40, 30, 40, 50]; // Ana 2.0 s, Ben 1.5 s, Mia 2.0 s, Leo 2.5 s after GO: beats
const LOOPS: Loop[][] = [
  [{ out: 4200, along: 5200 }, { out: 15000, along: 21000 }],
  [{ out: 3000, along: -3600 }, { out: 5200, along: -6000 }],
  [{ out: 3600, along: 4200 }, { out: 6000, along: 7000 }],
  [{ out: 4600, along: -5200 }, { out: 5600, along: -5600 }],
];
/** Close enough to a waypoint to head for the next one. */
const REACHED = 700;
/** Long enough for Ana's big loop to come home. */
const MAX_STEPS = 420;

export interface PlayerSnap {
  id: PlayerId;
  x: number;
  y: number;
  heading: number;
  trail: Point[];
  land: Land;
}

export interface Capture {
  id: PlayerId;
  step: number;
  /** Where the head got home. */
  point: Point;
  gained: Land;
}

export interface Match {
  /** Everyone, after each step (index 0: the start, before the first step). */
  snaps: PlayerSnap[][];
  captures: Capture[];
  final: TerritoryState;
}

function waypoints(id: PlayerId, scale: number): Point[] {
  const s = spawnPoint(id, IDS.length, RADIUS);
  const length = Math.hypot(s.x, s.y);
  const out = { x: s.x / length, y: s.y / length };
  const side = { x: -out.y, y: out.x };
  const at = (o: number, a: number) => ({ x: s.x + out.x * o + side.x * a, y: s.y + out.y * o + side.y * a });
  return LOOPS[id]!.flatMap((loop, k) => {
    const f = k === 0 ? scale : 1;
    return [at(loop.out * f, 0), at(loop.out * f, loop.along * f), at(0, loop.along * f), at(0, 0)];
  });
}

function simulate(scales: readonly number[], steps = MAX_STEPS): Match {
  const state = createTerritory(IDS, RADIUS);
  const routes = IDS.map((id) => waypoints(id, scales[id]!));
  const legs = IDS.map(() => 0);
  const snap = () => state.players.map((p) => ({ id: p.id, x: p.x, y: p.y, heading: p.heading, trail: [...p.trail], land: p.land }));
  const snaps: PlayerSnap[][] = [snap()];
  const captures: Capture[] = [];
  for (let step = 1; step <= steps; step++) {
    const targets = new Map<PlayerId, number>();
    for (const p of state.players) {
      const path = routes[p.id]!;
      while (legs[p.id]! < path.length - 1 && Math.hypot(path[legs[p.id]!]!.x - p.x, path[legs[p.id]!]!.y - p.y) < REACHED) legs[p.id]! += 1;
      const to = path[legs[p.id]!]!;
      targets.set(p.id, angleOf(to.x - p.x, to.y - p.y));
    }
    const before = new Map(state.players.map((p) => [p.id, p.land]));
    for (const event of stepTerritory(state, SHAPE, { targets })) {
      if (event.type !== "capture") continue;
      const after = state.players.find((p) => p.id === event.id)!.land;
      captures.push({ id: event.id, step, point: event.point, gained: difference(after, before.get(event.id)!, FillRule.NonZero) });
    }
    snaps.push(snap());
  }
  return { snaps, captures, final: state };
}

/** Sizes each friend's first loop so it comes home on its beat (the friends are far apart, so each is found alone). */
function build(): Match {
  const scales = IDS.map(() => 1);
  for (const id of IDS) {
    let lo = 0.3;
    let hi = 2.5;
    for (let i = 0; i < 18; i++) {
      scales[id] = (lo + hi) / 2;
      const first = simulate(scales, FIRST_CAPTURE_STEP[id]! + 1).captures.find((c) => c.id === id);
      if (!first || first.step > FIRST_CAPTURE_STEP[id]!) hi = scales[id]!;
      else lo = scales[id]!;
    }
    scales[id] = lo;
  }
  return simulate(scales);
}

export const MATCH = build();

/** The step Ana's big loop comes home on: the match's last moment before its ending. */
export const WINNING_STEP = MATCH.captures.filter((c) => c.id === 0).at(-1)?.step ?? MAX_STEPS;

export function shareOf(land: Land): number {
  return landShare(landArea(land), ARENA_AREA);
}

/** The room's summary of the match, as finished: ranked from the lands as they are when Ana's big loop comes home. */
export function finishedArena(): Arena {
  const state = { ...MATCH.final, players: MATCH.final.players.map((p, i) => ({ ...p, land: MATCH.snaps[WINNING_STEP]![i]!.land })) };
  const results = rankTerritory(state);
  return {
    gameId: "territory",
    startedAt: 0,
    startsAt: 0,
    endsAt: 0,
    radius: RADIUS,
    entrants: FRIENDS.map((name, id) => ({ id, name })),
    finished: true,
    results,
    championIds: results.filter((r) => r.place === 1).map((r) => r.id),
  };
}

export const RADIUS_WORLD = RADIUS;
