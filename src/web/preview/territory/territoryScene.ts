import type { Arena } from "../../../shared/arena/types";
import { arenaRadiusFor, spawnPoint } from "../../../shared/games/territory/arena";
import { angleOf, angleToRadians } from "../../../shared/games/territory/movement";
import { rankTerritory } from "../../../shared/games/territory/ranking";
import { arenaShape, createTerritory, stepTerritory } from "../../../shared/games/territory/simulation";
import type { Point, TerritoryState } from "../../../shared/games/territory/types";
import type { PlayerId } from "../../../shared/rooms/types";
import type { EffectView, EndingView, FrameView, KnockoutView, PlayerFrame } from "../../games/territory/engine/frame";

/**
 * A Territory match in the middle of play, made with the game's own simulation (no server): each player
 * steers a loop out of their land. The first two come home (their loops become land, the first one's the
 * biggest), the last one is still out on a trail. Deterministic, so every replay looks the same.
 */

const NAMES = ["Brave Otter", "Swift Squid", "Mighty Eagle"];
/** Each player's loop: how far out and how far along the ring (world units), and whether they come home. */
const LOOPS = [
  { out: 9000, along: 9000, home: true },
  { out: 6000, along: 6000, home: true },
  { out: 6000, along: 6000, home: false },
] as const;
/** Close enough to a waypoint to head for the next one. */
const REACHED = 900;
const MAX_STEPS = 600;

export const SCENE_IDS: PlayerId[] = NAMES.map((_, id) => id);
/** The player still out on a trail: the one knocked out in the kill preview. */
export const VICTIM_ID: PlayerId = 2;

function route(index: number, radius: number): Point[] {
  const s = spawnPoint(index, NAMES.length, radius);
  const length = Math.hypot(s.x, s.y);
  const out = { x: s.x / length, y: s.y / length };
  const along = { x: -out.y, y: out.x };
  const { out: o, along: a, home } = LOOPS[index]!;
  const at = (k: number, m: number) => ({ x: s.x + out.x * k + along.x * m, y: s.y + out.y * k + along.y * m });
  const points = [at(o, 0), at(o, a), at(0, a)];
  return home ? [...points, s] : points;
}

export function buildScene(): TerritoryState {
  const radius = arenaRadiusFor(NAMES.length);
  const state = createTerritory(SCENE_IDS, radius);
  const shape = arenaShape(radius);
  const routes = SCENE_IDS.map((id) => route(id, radius));
  const legs = SCENE_IDS.map(() => 0);
  for (let step = 0; step < MAX_STEPS && legs.some((leg, i) => leg < routes[i]!.length); step++) {
    const targets = new Map<PlayerId, number>();
    for (const p of state.players) {
      const path = routes[p.id]!;
      if (legs[p.id]! < path.length && Math.hypot(path[legs[p.id]!]!.x - p.x, path[legs[p.id]!]!.y - p.y) < REACHED) legs[p.id]! += 1;
      const to = path[Math.min(legs[p.id]!, path.length - 1)]!;
      targets.set(p.id, angleOf(to.x - p.x, to.y - p.y));
    }
    stepTerritory(state, shape, { targets });
  }
  return state;
}

/** The scene as one drawn frame, from `myId`'s point of view (null: watching). */
export function sceneFrame(
  state: TerritoryState,
  myId: PlayerId | null,
  options: { gone?: PlayerId; effects?: EffectView[]; ending?: EndingView | null; meAt?: Point } = {},
): FrameView {
  const players: PlayerFrame[] = state.players.map((p) => {
    const gone = p.id === options.gone;
    const at = p.id === myId && options.meAt ? options.meAt : p;
    return {
      id: p.id,
      isMe: p.id === myId,
      head: gone ? null : { x: at.x, y: at.y, angle: angleToRadians(p.heading) },
      trail: gone || !p.trail.length ? null : p.trail,
      land: [p.land],
      home: p.land,
    };
  });
  players.sort((a, b) => Number(a.isMe) - Number(b.isMe));
  const me = players.find((p) => p.isMe)?.head;
  const ending = options.ending ?? null;
  return {
    radius: state.radius,
    players,
    effects: options.effects ?? [],
    focus: me && !ending ? { x: me.x, y: me.y } : null,
    ending,
  };
}

/** The room's summary of the scene as a finished match: ranked from the lands as they are. */
export function sceneArena(state: TerritoryState): Arena {
  const results = rankTerritory(state);
  return {
    gameId: "territory",
    startedAt: 0,
    startsAt: 0,
    endsAt: 0,
    radius: state.radius,
    entrants: NAMES.map((name, id) => ({ id, name })),
    finished: true,
    results,
    championIds: results.filter((r) => r.place === 1).map((r) => r.id),
  };
}

/** Your knockout of the victim, as the knockout notices show it. */
export function sceneKnockout(myId: PlayerId, at: number): KnockoutView {
  return { id: VICTIM_ID, by: myId, reason: "cut", at };
}
