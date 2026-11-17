import { TERRITORY_CONFIG } from "../../../src/shared/games/territory/config";
import { landBounds, landArea } from "../../../src/shared/games/territory/geometry";
import { angleToRadians } from "../../../src/shared/games/territory/movement";
import type { Land } from "../../../src/shared/games/territory/types";
import type { PlayerId } from "../../../src/shared/rooms/types";
import { TERRITORY_CLIENT_CONFIG } from "../../../src/web/games/territory/config";
import { captureSize } from "../../../src/web/games/territory/captureSize";
import { leaderOf } from "../../../src/web/games/territory/engine/leader";
import type { EffectView, FrameView, PlayerFrame } from "../../../src/web/games/territory/engine/frame";
import { MATCH, RADIUS_WORLD, shareOf, STEPS_PER_SECOND } from "./match";

/**
 * One drawn moment of the friends' match, as the app's client would hand it to the renderer: heads glide between the
 * simulation's steps, and every capture so far brings its effects (your own land filling in, others' flashing, a
 * hop for joy on a big one). `msAt` turns a step into the renderer's clock (the video's time, in ms).
 */

const HOPS = TERRITORY_CLIENT_CONFIG.look.headMotion.hops;
const ANGLE_STEPS = TERRITORY_CONFIG.angleSteps;

const areas = new WeakMap<Land, number>();
function areaOf(land: Land): number {
  let a = areas.get(land);
  if (a === undefined) {
    a = landArea(land);
    areas.set(land, a);
  }
  return a;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % ANGLE_STEPS;
  if (d > ANGLE_STEPS / 2) d -= ANGLE_STEPS;
  if (d < -ANGLE_STEPS / 2) d += ANGLE_STEPS;
  return a + d * t;
}

export interface MatchView {
  frame: FrameView;
  shares: { id: PlayerId; share: number }[];
}

export function matchView(me: PlayerId, step: number, msAt: (step: number) => number, ending: { startedAt: number } | null = null): MatchView {
  const last = MATCH.snaps.length - 1;
  const s = Math.max(0, Math.min(last, step));
  const k = Math.min(last - 1, Math.floor(s));
  const t = s - k;
  const a = MATCH.snaps[k]!;
  const b = MATCH.snaps[k + 1]!;

  const players: PlayerFrame[] = a.map((p, i) => {
    const q = b[i]!;
    const head = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, angle: angleToRadians(lerpAngle(p.heading, q.heading, t)) };
    return {
      id: p.id,
      isMe: p.id === me,
      head,
      trail: p.trail.length ? [...p.trail.slice(0, -1), head] : null,
      land: [p.land],
      home: p.land,
    };
  });
  players.sort((x, y) => Number(x.isMe) - Number(y.isMe));

  const effects: EffectView[] = [];
  for (const c of MATCH.captures) {
    if (c.step > k || !c.gained.length) continue;
    const startedAt = msAt(c.step);
    if (c.id === me) {
      const bounds = landBounds(c.gained)!;
      const reach = Math.max(1, ...[bounds.minX, bounds.maxX].flatMap((cx) => [bounds.minY, bounds.maxY].map((cy) => Math.hypot(cx - c.point.x, cy - c.point.y))));
      effects.push({ kind: "fill", id: c.id, land: c.gained, x: c.point.x, y: c.point.y, reach, startedAt });
    } else effects.push({ kind: "flash", land: c.gained, startedAt });
    const size = captureSize(landArea(c.gained));
    if (size !== "small") {
      const hop = HOPS[size];
      effects.push({ kind: "cheer", id: c.id, height: hop.height * TERRITORY_CONFIG.trailWidth, ms: hop.ms, spins: hop.spins, startedAt });
    }
  }

  const mine = players.find((p) => p.isMe)!.head!;
  const frame: FrameView = {
    radius: RADIUS_WORLD,
    players,
    effects,
    focus: ending ? null : { x: mine.x, y: mine.y },
    ending: ending ? { winners: [0], startedAt: ending.startedAt } : null,
    leader: ending ? null : leaderOf(a.map((p) => ({ id: p.id, area: areaOf(p.land) }))),
  };
  const shares = a.map((p) => ({ id: p.id, share: shareOf(p.land) })).sort((x, y) => y.share - x.share || x.id - y.id);
  return { frame, shares };
}

export const stepsPerSecond = STEPS_PER_SECOND;
