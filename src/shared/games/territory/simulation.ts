import type { PlayerId } from "../../rooms/types";
import { arenaPolygon, headLimit, spawnPoint, startLand, wallBand } from "./arena";
import { captureLand, keepConnected, mergeLand, subtractLand, type ArenaShape } from "./capture";
import { TERRITORY_CONFIG, TERRITORY_TICKS } from "./config";
import {
  boundsOverlap,
  firstEdgeCrossing,
  landArea,
  landBounds,
  pointInLand,
  segmentDistanceSq,
  trimPolylineEnd,
} from "./geometry";
import { angleOf, moveHead, separateHeads } from "./movement";
import type { LandChange, Point, TerritoryEvent, TerritoryPlayer, TerritoryState } from "./types";

/**
 * The authoritative match: state + inputs → next state, one fixed step at a time. No I/O, no timers,
 * no randomness. Steps mutate the state they are given (the server owns it; copies cost too much at 20/s).
 */

export function arenaShape(radius: number): ArenaShape {
  const arena = arenaPolygon(radius);
  return { arena, band: wallBand(arena), headLimit: headLimit(radius) };
}

/** Players in `ids` order start evenly around the arena, facing along the ring (clockwise). */
export function createTerritory(ids: readonly PlayerId[], radius: number): TerritoryState {
  const players = ids.map((id, index): TerritoryPlayer => {
    const spawn = spawnPoint(index, ids.length, radius);
    const heading = angleOf(-spawn.y, spawn.x);
    return {
      id,
      x: spawn.x,
      y: spawn.y,
      heading,
      target: heading,
      land: startLand(spawn),
      trail: [],
      alive: true,
      outTick: null,
      outReason: null,
      cutBy: null,
    };
  });
  return { tick: 0, radius, players, ended: false };
}

/** Who cuts `victim`'s trail this step: the closest head that crossed it (lowest id on a tie), or null. */
function findCutter(
  victim: TerritoryPlayer,
  heads: readonly TerritoryPlayer[],
  from: ReadonlyMap<PlayerId, Point>,
): PlayerId | null {
  if (victim.trail.length < 2) return null;
  const reachSq = TERRITORY_CONFIG.cutReach ** 2;
  const cuttable = trimPolylineEnd(victim.trail, TERRITORY_CONFIG.headGraceLength);
  if (cuttable.length < 2) return null;
  const bounds = landBounds([cuttable])!;
  let best: { id: PlayerId; distSq: number } | null = null;
  for (const head of heads) {
    if (head.id === victim.id) continue; // Crossing your own trail is allowed.
    const start = from.get(head.id)!;
    const end = { x: head.x, y: head.y };
    const swept = { minX: Math.min(start.x, end.x), minY: Math.min(start.y, end.y), maxX: Math.max(start.x, end.x), maxY: Math.max(start.y, end.y) };
    if (!boundsOverlap(swept, bounds, TERRITORY_CONFIG.cutReach)) continue;
    for (let i = 1; i < cuttable.length; i++) {
      const d = segmentDistanceSq(start, end, cuttable[i - 1]!, cuttable[i]!);
      if (d <= reachSq && (!best || d < best.distSq || (d === best.distSq && head.id < best.id))) best = { id: head.id, distSq: d };
    }
  }
  return best?.id ?? null;
}

/** Follows who-cut-whom to the first player still in, so land never goes to someone who is out. */
function heirOf(victim: TerritoryPlayer, byId: ReadonlyMap<PlayerId, TerritoryPlayer>, cutThisStep: ReadonlyMap<PlayerId, PlayerId>): TerritoryPlayer | null {
  const seen = new Set<PlayerId>([victim.id]);
  let next = cutThisStep.get(victim.id) ?? null;
  while (next !== null && !seen.has(next)) {
    const player = byId.get(next)!;
    if (player.alive) return player;
    seen.add(next);
    next = cutThisStep.get(next) ?? null;
  }
  return null;
}

export interface StepInput {
  /** New steering targets, applied before moving. */
  targets?: ReadonlyMap<PlayerId, number>;
  /** Players who quit; they go out this step and their land vanishes. */
  quits?: readonly PlayerId[];
}

/** Advances the match one step; returns what happened, for the clients. */
export function stepTerritory(state: TerritoryState, shape: ArenaShape, input: StepInput = {}): TerritoryEvent[] {
  if (state.ended) return [];
  state.tick += 1;
  const events: TerritoryEvent[] = [];
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const goOut = (p: TerritoryPlayer, reason: TerritoryPlayer["outReason"], by: PlayerId | null) => {
    p.alive = false;
    p.outTick = state.tick;
    p.outReason = reason;
    p.cutBy = by;
    p.trail = [];
  };

  for (const id of input.quits ?? []) {
    const p = byId.get(id);
    if (!p?.alive) continue;
    goOut(p, "quit", null);
    p.land = [];
    events.push({ type: "out", id, reason: "quit", by: null, lands: [{ id, land: [] }] });
  }

  const alive = state.players.filter((p) => p.alive);
  const from = new Map<PlayerId, Point>(alive.map((p) => [p.id, { x: p.x, y: p.y }]));

  // Move.
  for (const p of alive) {
    const target = input.targets?.get(p.id);
    if (target !== undefined) p.target = target;
    Object.assign(p, moveHead(p, p.target, shape.headLimit));
  }
  separateHeads(alive, shape.headLimit);

  // Leave home, extend trails, come home.
  const homecomers: TerritoryPlayer[] = [];
  for (const p of alive) {
    const start = from.get(p.id)!;
    const head = { x: p.x, y: p.y };
    const inside = pointInLand(p.land, head);
    if (p.trail.length === 0) {
      if (inside) continue;
      // The trail starts exactly on the land's edge (or where they stood, if the land under them was taken).
      const exit = firstEdgeCrossing(p.land, start, head) ?? start;
      p.trail = exit.x === head.x && exit.y === head.y ? [exit] : [exit, head];
      events.push({ type: "trailStart", id: p.id, point: exit });
    } else if (inside) {
      const last = p.trail[p.trail.length - 1]!;
      p.trail.push(firstEdgeCrossing(p.land, last, head) ?? head);
      homecomers.push(p);
    } else {
      const last = p.trail[p.trail.length - 1]!;
      if (last.x !== head.x || last.y !== head.y) p.trail.push(head);
    }
  }

  // Captures, lowest id first when two land on the same step. Land cut in two keeps only one part.
  const landLost = new Map<PlayerId, PlayerId>();
  for (const p of homecomers) {
    if (!p.alive) continue;
    const entry = p.trail[p.trail.length - 1]!;
    p.land = captureLand(p.land, p.trail, shape);
    p.trail = [];
    const lands: LandChange[] = [{ id: p.id, land: p.land }];
    const gained = landBounds(p.land);
    for (const other of state.players) {
      if (other.id === p.id || other.land.length === 0) continue;
      const theirs = landBounds(other.land);
      if (!gained || !theirs || !boundsOverlap(gained, theirs)) continue;
      const left = subtractLand(other.land, p.land);
      if (landArea(left) === landArea(other.land)) continue;
      const anchor = other.trail[0] ?? { x: other.x, y: other.y };
      const kept = other.alive ? keepConnected(other.land, left, anchor) : left;
      other.land = kept;
      lands.push({ id: other.id, land: kept });
      if (kept.length === 0 && other.alive && !landLost.has(other.id)) landLost.set(other.id, p.id);
    }
    events.push({ type: "capture", id: p.id, point: entry, lands });
  }

  // Cuts: judged on this step's trails, so a victim who made it home this step is safe.
  const cutThisStep = new Map<PlayerId, PlayerId>();
  for (const victim of alive) {
    const cutter = findCutter(victim, alive, from);
    if (cutter !== null) cutThisStep.set(victim.id, cutter);
  }

  // Everyone out this step goes out together; then land passes to the first cutter still in.
  const outNow = alive.filter((p) => cutThisStep.has(p.id) || landLost.has(p.id));
  // Whoever took the last of someone's land gets the knockout (their land is already theirs).
  for (const p of outNow) goOut(p, cutThisStep.has(p.id) ? "cut" : "land", cutThisStep.get(p.id) ?? landLost.get(p.id) ?? null);
  for (const p of outNow) {
    const lands: LandChange[] = [{ id: p.id, land: [] }];
    const heir = p.land.length ? heirOf(p, byId, cutThisStep) : null;
    if (heir) {
      heir.land = mergeLand(heir.land, p.land);
      lands.push({ id: heir.id, land: heir.land });
    }
    p.land = [];
    events.push({ type: "out", id: p.id, reason: p.outReason!, by: p.cutBy, lands });
  }

  const stillIn = state.players.filter((p) => p.alive).length;
  if (state.tick >= TERRITORY_TICKS.matchTicks || stillIn <= (state.players.length > 1 ? 1 : 0)) state.ended = true;
  return events;
}
