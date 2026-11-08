import { isHome, trailEntry, trailExit } from "../../../../shared/games/territory/home";
import { moveHead, separateHeads } from "../../../../shared/games/territory/movement";
import type { Land, Point } from "../../../../shared/games/territory/types";
import { currentTrail, latestLand, type ReplicaPlayer } from "./replica";

export interface SentInput {
  seq: number;
  /** Step the server applies it on (the step it was predicted for). */
  tick: number;
  target: number;
}

export interface PredictedStep {
  tick: number;
  x: number;
  y: number;
  heading: number;
}

export interface Prediction {
  /** From the server's latest step (first) up to the predicted step (last). */
  steps: PredictedStep[];
  /** The trail as it will be at the last step (server part + predicted part), or null if home by then. */
  trail: Point[] | null;
  /** A predicted homecoming: the step and the full trail that comes home (exit to entry). */
  capture: { tick: number; trail: Point[] } | null;
}

/**
 * Your own head, ahead of the server: the server's latest state for you, replayed forward with the
 * steering you sent that it has not applied yet. Uses the same integer movement as the server, so on a
 * steady connection the two agree to the unit. Other heads block yours as on the server: they are
 * moved along with it (steering toward their last known target, which is what the server does until
 * they steer again) and pushed apart with the server's own code. Recomputed from the server's state
 * every frame, so a correction (a late input, someone steering) is simply the next frame's answer.
 */
export class OwnPredictor {
  private inputs: SentInput[] = [];
  private seq = 0;

  /** After a full sync (e.g. a reloaded page) keep numbering after what the server already has. */
  adoptServerSeq(seq: number) {
    if (seq > this.seq) this.seq = seq;
    this.inputs = [];
  }

  nextInput(tick: number, target: number): SentInput {
    this.seq = (this.seq + 1) & 0xffff;
    const input = { seq: this.seq, tick, target };
    this.inputs.push(input);
    return input;
  }

  /** `everyone`: all players in the server's order (you included), so heads are pushed apart in the same order. */
  predict(me: ReplicaPlayer, serverTick: number, upTo: number, limit: number, everyone: readonly ReplicaPlayer[] = [me]): Prediction | null {
    const head = me.head;
    if (!head) return null;
    const heads = everyone.flatMap((p) => (p.alive && p.head ? [{ id: p.id, x: p.head.x, y: p.head.y, heading: p.head.heading, target: p.head.target }] : []));
    const mine = heads.find((h) => h.id === me.id);
    if (!mine) return null;
    // Drop what the server has applied; anything older it has not seen yet will land on its next step.
    const applied = head.inputSeq;
    this.inputs = this.inputs.filter((i) => ((i.seq - applied) & 0xffff) > 0 && ((i.seq - applied) & 0xffff) < 0x8000);
    const land: Land = latestLand(me).land;
    const steps: PredictedStep[] = [{ tick: serverTick, x: head.x, y: head.y, heading: head.heading }];
    let trail: Point[] | null = head.outside ? (currentTrail(me)?.points.map(({ x, y }) => ({ x, y })) ?? null) : null;
    let capture: Prediction["capture"] = null;
    for (let tick = serverTick + 1; tick <= upTo; tick++) {
      for (const input of this.inputs) if (Math.max(input.tick, serverTick + 1) === tick) mine.target = input.target;
      const prev = { x: mine.x, y: mine.y };
      for (const h of heads) Object.assign(h, moveHead(h, h.target, limit));
      if (heads.length > 1) separateHeads(heads, limit);
      const state = { x: mine.x, y: mine.y, heading: mine.heading };
      steps.push({ tick, ...state });
      const home = isHome(land, state);
      if (!trail && !home) {
        const exit = trailExit(land, prev, state);
        trail = exit.x === state.x && exit.y === state.y ? [exit] : [exit, { x: state.x, y: state.y }];
      } else if (trail && home) {
        const last = trail[trail.length - 1]!;
        if (!capture) capture = { tick, trail: [...trail, trailEntry(land, last, state)] };
        trail = null;
      } else if (trail) {
        const last = trail[trail.length - 1]!;
        if (last.x !== state.x || last.y !== state.y) trail.push({ x: state.x, y: state.y });
      }
    }
    return { steps, trail, capture };
  }
}
