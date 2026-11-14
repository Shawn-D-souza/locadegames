import { POOL_CONFIG } from "../../../shared/games/pool/config";
import type { PoolShotResult, PoolSeat } from "../../../shared/games/pool/types";
import type { HapticStep } from "../../haptics/definition";
import type { HapticName } from "../../haptics/hapticBook";
import type { SoundStep } from "../../sound/soundBook";
import type { ShotFrames } from "./shotFrames";

/** Someone else's shot sits back a little; watching, more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** Hits softer than this (units / s along the hit) make no sound; this hard and up, a click or thud at full volume. */
const QUIET_HIT = { ball: 6, cushion: 14 } as const;
const LOUD_HIT = { ball: 140, cushion: 160 } as const;
/** Clicks and thuds closer together than this blur into one: only the first (and the loudest wins nothing: it's a break). */
const HIT_SPACING_MS = { ball: 28, cushion: 45 } as const;
/** A break makes dozens of clicks: no more than this many. */
const MAX_HITS = 28;
/** The strike's take: soft below the first share of full power, hard above the second. */
const STRIKE_TAKES = [0.35, 0.7] as const;

/** Whose shot it is, from this phone: yours, another player's, or one you're watching (not in the game). */
export type Actor = "mine" | "theirs" | "watching";

/**
 * Every sound and feel of one shot, timed from the moment it starts on screen (ms): the cue's strike at the end of
 * the lead, every click and cushion as the balls roll (softer the softer the hit), each ball dropping, then what it
 * came to (a foul, or out by the black) as the balls settle. Felt: your strike, your foul, going out, and any of your
 * balls going in (whoever shot it).
 */
export function shotCues(shot: PoolShotResult, frames: ShotFrames, actor: Actor, mySeat: PoolSeat | null): { sounds: SoundStep[]; haptics: HapticStep<HapticName>[] } {
  const { leadMs } = POOL_CONFIG;
  const volume = actor === "mine" ? 1 : actor === "theirs" ? OTHERS_VOLUME : WATCHING_VOLUME;
  const sounds: SoundStep[] = [];
  const haptics: HapticStep<HapticName>[] = [];
  const strikeTake = STRIKE_TAKES.filter((share) => shot.shot.power >= share).length;
  sounds.push({ sound: "poolStrike", at: leadMs, variant: strikeTake, volume });
  if (actor === "mine") haptics.push({ haptic: "poolStrike", at: leadMs });

  const lastAt = { ball: -Infinity, cushion: -Infinity };
  let hits = 0;
  let clackTake = 0;
  for (const event of frames.events) {
    const at = leadMs + event.ms;
    if (event.kind === "pocket") {
      sounds.push({ sound: "poolPocket", at, volume });
      if (mySeat !== null && shot.before[event.ball]!.owner === mySeat) {
        sounds.push({ sound: "poolPotted", at: at + 60, volume: 1 });
        haptics.push({ haptic: "poolPotted", at });
      }
      continue;
    }
    const kind = event.kind;
    if (event.speed < QUIET_HIT[kind] || at - lastAt[kind] < HIT_SPACING_MS[kind] || hits >= MAX_HITS) continue;
    lastAt[kind] = at;
    hits += 1;
    const loud = Math.min(1, event.speed / LOUD_HIT[kind]);
    if (kind === "ball") {
      sounds.push({ sound: "poolClack", at, variant: clackTake, volume: volume * (0.25 + 0.75 * loud) });
      clackTake = (clackTake + 1) % 4;
    } else {
      sounds.push({ sound: "poolCushion", at, volume: volume * (0.3 + 0.7 * loud) });
    }
  }

  const settled = leadMs + frames.rollMs;
  if (shot.out) {
    sounds.push({ sound: "poolOut", at: settled, volume: actor === "mine" ? 1 : volume });
    if (actor === "mine") haptics.push({ haptic: "poolOut", at: settled });
  } else if (shot.foul) {
    sounds.push({ sound: "poolFoul", at: settled, volume });
    if (actor === "mine") haptics.push({ haptic: "poolFoul", at: settled });
  }
  return { sounds: sounds.sort((a, b) => a.at - b.at), haptics: haptics.sort((a, b) => a.at - b.at) };
}
