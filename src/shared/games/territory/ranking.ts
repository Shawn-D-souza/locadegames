import type { ArenaResult } from "../../arena/types";
import { arenaPolygon } from "./arena";
import { TERRITORY_CONFIG } from "./config";
import { landArea } from "./geometry";
import type { TerritoryState } from "./types";

/** Land share in hundredths of a percent (7.36% = 736), so it fits whole numbers on the wire and in results. */
export const SHARE_SCALE = 10_000;

export function landShare(area: number, arenaArea: number): number {
  return Math.round((area / arenaArea) * SHARE_SCALE);
}

/**
 * Final order: players still in by land (bigger first), then players who went out by how long they
 * lasted. Exactly level players share a place (and a shared first place is a shared title).
 */
export function rankTerritory(state: TerritoryState): ArenaResult[] {
  const arenaArea = landArea(arenaPolygon(state.radius));
  const rows = state.players.map((p) => ({
    id: p.id,
    alive: p.alive,
    area: landArea(p.land),
    outTick: p.outTick,
    quit: p.outReason === "quit",
  }));
  // Higher is better: alive players by area, out players by the step they went out on.
  const score = (r: (typeof rows)[number]) => (r.alive ? [1, r.area] : [0, r.outTick ?? 0]) as [number, number];
  const better = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    const [sa, va] = score(a);
    const [sb, vb] = score(b);
    return sb - sa || vb - va;
  };
  const sorted = [...rows].sort((a, b) => better(a, b) || a.id - b.id);
  return sorted.map((r) => ({
    id: r.id,
    place: 1 + sorted.filter((o) => better(o, r) < 0).length,
    landShare: r.alive ? landShare(r.area, arenaArea) : 0,
    survivedMs: r.alive ? null : (r.outTick ?? 0) * TERRITORY_CONFIG.tickMs,
    quit: r.quit,
  }));
}
