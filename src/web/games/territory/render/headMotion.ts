import { TERRITORY_CONFIG } from "../../../../shared/games/territory/config";
import type { PlayerId } from "../../../../shared/rooms/types";
import { seededRandom } from "../../../utils/seededRandom";
import { TERRITORY_CLIENT_CONFIG } from "../config";
import type { EffectView, PlayerFrame } from "../engine/frame";

/**
 * How each head looks this frame, never where it is: how hard it's turning (eased, so the eyes glide into
 * the turn), its blinks, each player at random times of their own, and its hops for joy (the client's
 * cheer effects: a capture, a knockout with a spin). Read from the drawn frames on the phone's own clock,
 * so it needs nothing from the simulation and gives nothing back to it.
 */

const MOTION = TERRITORY_CLIENT_CONFIG.look.headMotion;
/** Fastest turn in radians per second (the simulation's limit). */
const MAX_TURN = (TERRITORY_CONFIG.turnPerStep / TERRITORY_CONFIG.angleSteps) * 2 * Math.PI * (1000 / TERRITORY_CONFIG.tickMs);

/** How a head is drawn this frame. */
export interface HeadStance {
  /** -1 (turning hard left) to 1 (hard right), eased: the pupils look into it. */
  turn: number;
  /** 0 eyes open, 1 shut. */
  blink: number;
  /** How far it is off the ground, hopping for joy (world units). */
  lift: number;
  /** How far it has turned in a knockout's spin (radians, added to its heading as drawn). */
  spin: number;
}

/** Eyes open, looking ahead, on the ground (also any head with no motion known). */
export const RESTING: Readonly<HeadStance> = { turn: 0, blink: 0, lift: 0, spin: 0 };

interface Motion {
  angle: number;
  nextBlinkAt: number;
  random: () => number;
  stance: HeadStance;
}

export class HeadMotion {
  private readonly motions = new Map<PlayerId, Motion>();
  private lastAt: number | null = null;

  /** Call once per frame with the heads about to be drawn and the frame's effects. */
  update(players: readonly PlayerFrame[], now: number, effects: readonly EffectView[] = []) {
    const elapsed = this.lastAt === null ? 0 : Math.min(now - this.lastAt, 100);
    this.lastAt = now;
    for (const p of players) {
      const head = p.head;
      if (!head) {
        this.motions.delete(p.id);
        continue;
      }
      let motion = this.motions.get(p.id);
      if (!motion) {
        const random = seededRandom(p.id * 7919 + 1);
        motion = { angle: head.angle, nextBlinkAt: now + blinkGap(random), random, stance: { ...RESTING } };
        this.motions.set(p.id, motion);
      }
      const stance = motion.stance;
      if (elapsed > 0) {
        const delta = Math.atan2(Math.sin(head.angle - motion.angle), Math.cos(head.angle - motion.angle));
        const target = Math.max(-1, Math.min(1, delta / (elapsed / 1000) / MAX_TURN));
        stance.turn += (target - stance.turn) * (1 - Math.pow(0.5, elapsed / MOTION.lookHalfLifeMs));
      }
      motion.angle = head.angle;

      const sinceBlink = now - motion.nextBlinkAt;
      if (sinceBlink >= MOTION.blinkMs) {
        motion.nextBlinkAt = now + blinkGap(motion.random);
        stance.blink = 0;
      } else stance.blink = sinceBlink > 0 ? Math.sin((Math.PI * sinceBlink) / MOTION.blinkMs) : 0;

      // Its newest hop for joy, if one is under way: up and down in an arc, spinning smoothly.
      stance.lift = 0;
      stance.spin = 0;
      let cheer: Extract<EffectView, { kind: "cheer" }> | null = null;
      for (const e of effects) if (e.kind === "cheer" && e.id === p.id && now >= e.startedAt && (!cheer || e.startedAt >= cheer.startedAt)) cheer = e;
      if (cheer) {
        const q = (now - cheer.startedAt) / cheer.ms;
        if (q < 1) {
          stance.lift = 4 * q * (1 - q) * cheer.height;
          stance.spin = cheer.spins * 2 * Math.PI * (q * q * (3 - 2 * q));
        }
      }
    }
  }

  /** How a head is drawn this frame (resting if unknown). */
  stance(id: PlayerId): Readonly<HeadStance> {
    return this.motions.get(id)?.stance ?? RESTING;
  }
}

function blinkGap(random: () => number): number {
  const [from, to] = MOTION.blinkEveryMs;
  return from + random() * (to - from);
}
