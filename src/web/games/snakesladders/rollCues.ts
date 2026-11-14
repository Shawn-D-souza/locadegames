import { SNAKESLADDERS_CONFIG, rollMs } from "../../../shared/games/snakesladders/config";
import type { SnakesRoll } from "../../../shared/games/snakesladders/types";
import type { HapticStep } from "../../haptics/definition";
import type { HapticName } from "../../haptics/hapticBook";
import type { SoundStep } from "../../sound/soundBook";
import { DIE_HITS } from "../dice/dieMotion";

/** Someone else's roll sits back a little; watching, more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** A hop's pop lands as the piece comes down on its square: this far through the hop (`HOP_AIR` in `geometry.ts`). */
const HOP_LANDS = 0.78;
/** The 6's tines come just after the die comes to rest, so the two don't blur. */
const SIX_AFTER_MS = 140;

/** Whose roll it is, from this phone: yours, another player's, or one you're watching (not in the game). */
export type Roller = "mine" | "theirs" | "watching";

/**
 * Every sound and feel of one roll, timed to how it plays out on screen (the shared timings, `rollMs`): the die
 * tumbling and landing, a 6, each hop, the ladder or the snake, a roll too big, three 6s, and getting home. Only your
 * own roll is felt (never a hop: nothing constant).
 */
export function rollCues(roll: SnakesRoll, roller: Roller, playerId: number): { sounds: SoundStep[]; haptics: HapticStep<HapticName>[] } {
  const { dieMs, settleMs, hopMs } = SNAKESLADDERS_CONFIG;
  // The die has come to rest (its last hit), and the piece sets off a beat later.
  const dieLands = DIE_HITS.at(-1)!.at * dieMs;
  const moves = dieMs + settleMs;
  const volume = roller === "mine" ? 1 : roller === "theirs" ? OTHERS_VOLUME : WATCHING_VOLUME;
  const sounds: SoundStep[] = [{ sound: "dieRoll", at: 0, volume }];
  const haptics: HapticStep<HapticName>[] = [{ haptic: "dieLands", at: dieLands }];
  const hopsEnd = moves + (roll.landed - roll.from) * hopMs;
  if (roll.again) {
    sounds.push({ sound: "dieSix", at: dieLands + SIX_AFTER_MS, volume });
    haptics.push({ haptic: "dieSix", at: dieLands + SIX_AFTER_MS });
  }
  for (let hop = 0; hop < roll.landed - roll.from; hop++) {
    sounds.push({ sound: "snakesLaddersHop", at: moves + (hop + HOP_LANDS) * hopMs, variant: Math.min(hop, 5), volume });
  }
  if (roll.kind === "ladder") {
    sounds.push({ sound: "snakesLaddersLadder", at: hopsEnd, volume });
    haptics.push({ haptic: "snakesLaddersLadder", at: hopsEnd });
  } else if (roll.kind === "snake") {
    sounds.push({ sound: "snakesLaddersSnake", at: hopsEnd, volume });
    haptics.push({ haptic: "snakesLaddersSnake", at: hopsEnd });
  } else if (roll.kind === "stuck") {
    sounds.push({ sound: "snakesLaddersStuck", at: moves, volume });
  } else if (roll.kind === "threeSixes") {
    sounds.push({ sound: "snakesLaddersThreeSixes", at: moves, volume });
    haptics.push({ haptic: "snakesLaddersThreeSixes", at: moves });
  }
  if (roll.finished) {
    sounds.push({ sound: "snakesLaddersHome", at: rollMs(roll), variant: playerId, volume });
    haptics.push({ haptic: "snakesLaddersHome", at: rollMs(roll) });
  }
  return { sounds, haptics: roller === "mine" ? haptics : [] };
}
