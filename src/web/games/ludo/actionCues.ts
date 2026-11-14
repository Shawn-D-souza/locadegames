import { LUDO_CONFIG, actionMs } from "../../../shared/games/ludo/config";
import type { LudoAction, LudoSeat } from "../../../shared/games/ludo/types";
import type { HapticStep } from "../../haptics/definition";
import type { HapticName } from "../../haptics/hapticBook";
import type { SoundStep } from "../../sound/soundBook";
import { DIE_HITS } from "../dice/dieMotion";
import { stepStartMs } from "./motion";

/** Someone else's action sits back a little; watching, more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** A hop's knock lands as the pawn comes down on its square: this far through the hop (`HOP_AIR` in `motion.ts`). */
const HOP_LANDS = 0.78;
/** The 6's tines come just after the die comes to rest, so the two don't blur. */
const SIX_AFTER_MS = 140;

/** Whose action it is, from this phone: yours, another player's, or one you're watching (not in the game). */
export type Actor = "mine" | "theirs" | "watching";

/**
 * Every sound and feel of one action, timed to how it plays out on screen (`actionMs`): the die tumbling and landing,
 * a 6, a pawn coming out or each hop, a capture, a pawn home, the last pawn home; a roll that moves nothing, three 6s.
 * Only your own action is felt, and one of your pawns being captured (`mySeat`; never a hop: nothing constant).
 * `home`: the progress of home on this board.
 */
export function actionCues(action: LudoAction, actor: Actor, playerId: number, mySeat: LudoSeat | null, home: number): { sounds: SoundStep[]; haptics: HapticStep<HapticName>[] } {
  const { dieMs, hopMs, enterMs } = LUDO_CONFIG;
  const volume = actor === "mine" ? 1 : actor === "theirs" ? OTHERS_VOLUME : WATCHING_VOLUME;
  const sounds: SoundStep[] = [];
  const mine: HapticStep<HapticName>[] = [];
  const felt: HapticStep<HapticName>[] = [];
  const start = stepStartMs(action);
  if (action.rolled) {
    const dieLands = DIE_HITS.at(-1)!.at * dieMs;
    sounds.push({ sound: "dieRoll", at: 0, volume });
    mine.push({ haptic: "dieLands", at: dieLands });
    if (action.die === 6 && action.outcome !== "threeSixes") {
      sounds.push({ sound: "dieSix", at: dieLands + SIX_AFTER_MS, volume });
      mine.push({ haptic: "dieSix", at: dieLands + SIX_AFTER_MS });
    }
  }
  if (action.outcome === "noMove") sounds.push({ sound: "ludoNoMove", at: start, volume });
  if (action.outcome === "threeSixes") {
    sounds.push({ sound: "ludoThreeSixes", at: start, volume });
    mine.push({ haptic: "ludoThreeSixes", at: start });
  }
  if (action.outcome === "choose" && actor === "mine") mine.push({ haptic: "ludoPick", at: start });
  const step = action.step;
  if (step) {
    const landed = start + (step.from < 0 ? enterMs : (step.to - step.from) * hopMs);
    if (step.from < 0) {
      sounds.push({ sound: "ludoEnter", at: start, volume });
      mine.push({ haptic: "ludoEnter", at: start + enterMs * HOP_LANDS });
    } else {
      for (let hop = 0; hop < step.to - step.from; hop++) {
        sounds.push({ sound: "ludoHop", at: start + (hop + HOP_LANDS) * hopMs, variant: Math.min(hop, 5), volume });
      }
    }
    if (step.captured.length > 0) {
      const victim = mySeat !== null && step.captured.some((c) => c.seat === mySeat);
      sounds.push({ sound: "ludoCapture", at: landed, volume: victim ? 1 : volume });
      mine.push({ haptic: "ludoCapture", at: landed });
      if (victim) felt.push({ haptic: "ludoCaptured", at: landed });
    }
    if (step.to === home && !action.finished) {
      sounds.push({ sound: "ludoPawnHome", at: landed, volume });
      mine.push({ haptic: "ludoPawnHome", at: landed });
    }
  }
  if (action.finished) {
    sounds.push({ sound: "ludoFinished", at: actionMs(action), variant: playerId, volume });
    mine.push({ haptic: "ludoFinished", at: actionMs(action) });
  }
  return { sounds, haptics: actor === "mine" ? mine : felt };
}
