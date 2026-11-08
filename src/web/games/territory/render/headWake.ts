import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { PlayerId } from "../../../../shared/rooms/types";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { PlayerFrame } from "../engine/frame";

/**
 * What a head kicks up behind it while it moves through its own land, like sand: every head, every so
 * often, a soft puff that grows, drifts aside and fades, and two small grains flicked out to the sides in a little hop. Read from the drawn frames on
 * the phone's own clock, so it needs nothing from the simulation and gives nothing back to it. Drawn on
 * the land, under trails and heads (`drawWake`).
 */

const W = TERRITORY_CONFIG.trailWidth;
const WAKE = TERRITORY_CLIENT_CONFIG.look.wake;
const GRAIN = WAKE.grains;
/** Enough room for every head's puffs and grains (8 players, each alive `lifeMs`, a puff and two grains every `everyMs`), reused. */
const MAX_PUFFS = 8 * 3 * Math.ceil(WAKE.lifeMs / WAKE.everyMs + 1);
/** A head must have moved this far since its last puff to leave another (standing still leaves none). */
const MIN_MOVE = 0.05 * W;

/** A soft puff, or a sand grain: a light one or a dark one. */
export type PuffShade = "puff" | "light" | "dark";

interface Puff {
  id: PlayerId;
  shade: PuffShade;
  x: number;
  y: number;
  /** Where it drifts to over its life (world units). */
  dx: number;
  dy: number;
  bornAt: number;
}

interface Emitter {
  lastAt: number;
  x: number;
  y: number;
  /** Alternates the puffs left and right. */
  count: number;
}

export class HeadWake {
  private readonly puffs: Puff[] = [];
  private readonly emitters = new Map<PlayerId, Emitter>();

  /** Call once per frame with the heads about to be drawn (not during the ending: no new puffs then). */
  update(players: readonly PlayerFrame[], now: number) {
    for (const p of players) {
      const head = p.head;
      // In its own land: no trail out.
      if (!head || p.trail) {
        this.emitters.delete(p.id);
        continue;
      }
      const emitter = this.emitters.get(p.id);
      if (!emitter) {
        this.emitters.set(p.id, { lastAt: now, x: head.x, y: head.y, count: 0 });
        continue;
      }
      if (now - emitter.lastAt < WAKE.everyMs) continue;
      const moved = Math.hypot(head.x - emitter.x, head.y - emitter.y) >= MIN_MOVE;
      emitter.lastAt = now;
      emitter.x = head.x;
      emitter.y = head.y;
      if (!moved) continue;
      emitter.count += 1;
      // Behind the head, a little to one side, then the other (a fixed sway, no randomness), drifting outward
      // like sand pushed aside; two grains flick out, one to each side, a little backward.
      const sway = ((emitter.count % 3) - 1) * WAKE.spread * W;
      const outward = emitter.count % 2 ? 1 : -1;
      const cos = Math.cos(head.angle);
      const sin = Math.sin(head.angle);
      const x = head.x - cos * WAKE.behind * W - sin * sway;
      const y = head.y - sin * WAKE.behind * W + cos * sway;
      const drift = WAKE.drift * W * outward;
      this.add({ id: p.id, shade: "puff", x, y, dx: -sin * drift, dy: cos * drift, bornAt: now });
      for (const side of [-1, 1]) {
        const reach = GRAIN.reach * W;
        // Dark grains with only some puffs (`darkEvery`: every third puff leaves its dark grain out).
        if (side !== outward && emitter.count % GRAIN.darkEvery === 0) continue;
        this.add({
          id: p.id,
          shade: side === outward ? "light" : "dark",
          x,
          y,
          dx: (-sin * side * GRAIN.out - cos * GRAIN.back) * reach,
          dy: (cos * side * GRAIN.out - sin * GRAIN.back) * reach,
          bornAt: now,
        });
      }
    }
    while (this.puffs.length && now - this.puffs[0]!.bornAt >= WAKE.lifeMs) this.puffs.shift();
  }

  private add(puff: Puff) {
    if (this.puffs.length >= MAX_PUFFS) this.puffs.shift();
    this.puffs.push(puff);
  }

  /**
   * Each puff and grain showing at `now`: whose, which shade, where, how big across (world units) and how
   * solid. A puff grows and fades; a grain flies out in a little hop, then fades.
   */
  forEachPuff(now: number, visit: (id: PlayerId, shade: PuffShade, x: number, y: number, size: number, alpha: number) => void) {
    for (const puff of this.puffs) {
      const since = now - puff.bornAt;
      if (puff.shade === "puff") {
        const t = since / WAKE.lifeMs;
        if (t < 0 || t >= 1) continue;
        const grow = 1 - (1 - t) * (1 - t);
        visit(puff.id, "puff", puff.x + puff.dx * grow, puff.y + puff.dy * grow, (WAKE.from + (WAKE.to - WAKE.from) * grow) * W, WAKE.alpha * (1 - t));
        continue;
      }
      const t = since / GRAIN.lifeMs;
      if (t < 0 || t >= 1) continue;
      const out = 1 - (1 - t) * (1 - t);
      const hop = 4 * t * (1 - t) * GRAIN.hop * W;
      visit(puff.id, puff.shade, puff.x + puff.dx * out, puff.y + puff.dy * out - hop, GRAIN.size * W, GRAIN.alpha * (1 - t * t));
    }
  }
}
