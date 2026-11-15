import type { CarromSeat, CarromShotResult } from "../../../shared/games/carrom/types";
import type { HapticStep } from "../../haptics/definition";
import type { HapticName } from "../../haptics/hapticBook";
import type { SoundStep } from "../../sound/soundBook";
import type { ShotFrames } from "./shotFrames";

/** Someone else's shot sits back a little; watching, more. */
const OTHERS_VOLUME = 0.8;
const WATCHING_VOLUME = 0.65;
/** Hits softer than this (units / s along the hit) make no sound; this hard and up, a click or knock at full volume. */
const QUIET_HIT = { disc: 6, wall: 14 } as const;
const LOUD_HIT = { disc: 150, wall: 170 } as const;
/** Clicks and knocks closer together than this blur into one. */
const HIT_SPACING_MS = { disc: 28, wall: 45 } as const;
/** A break makes dozens of clicks: no more than this many. */
const MAX_HITS = 28;
/** The flick's take: soft below the first share of full power, hard above the second. */
const FLICK_TAKES = [0.35, 0.7] as const;
/** Your points' notes come this long after the drop. */
const SCORED_AFTER_MS = 60;

/** Whose shot it is, from this phone: yours, another player's, or one you're watching (not in the game). */
export type Actor = "mine" | "theirs" | "watching";

/**
 * Every sound and feel of one shot, timed from the moment it's flicked (ms into the shot; the phone maps them onto its
 * own clock, which runs faster while it catches up): the flick, every click and knock as the discs slide (softer the
 * softer the hit), each drop (your points' notes on your own shot, the queen's notes for everyone), then what it came
 * to as they settle (a foul, the queen covered or going back). Felt: your flick, your points, your foul, your queen.
 */
export function shotCues(shot: CarromShotResult, frames: ShotFrames, actor: Actor): { sounds: SoundStep[]; haptics: HapticStep<HapticName>[] } {
  const volume = actor === "mine" ? 1 : actor === "theirs" ? OTHERS_VOLUME : WATCHING_VOLUME;
  const sounds: SoundStep[] = [];
  const haptics: HapticStep<HapticName>[] = [];
  sounds.push({ sound: "carromFlick", at: 0, variant: FLICK_TAKES.filter((share) => shot.shot.power >= share).length, volume });
  if (actor === "mine") haptics.push({ haptic: "carromFlick", at: 0 });

  const lastAt = { disc: -Infinity, wall: -Infinity };
  let hits = 0;
  let clackTake = 0;
  let scoredFelt = false;
  for (const event of frames.events) {
    const at = event.ms;
    if (event.kind === "pocket") {
      sounds.push({ sound: "carromPocket", at, volume });
      const kind = event.disc === 0 ? "striker" : shot.before[event.disc - 1]!.kind;
      if (shot.foul || kind === "striker") continue;
      if (kind === "queen") sounds.push({ sound: "carromQueen", at: at + SCORED_AFTER_MS, volume });
      else if (actor === "mine") sounds.push({ sound: "carromScored", at: at + SCORED_AFTER_MS, volume: 1 });
      if (actor === "mine" && !scoredFelt) {
        haptics.push({ haptic: "carromScored", at });
        scoredFelt = true;
      }
      continue;
    }
    const kind = event.kind;
    if (event.speed < QUIET_HIT[kind] || at - lastAt[kind] < HIT_SPACING_MS[kind] || hits >= MAX_HITS) continue;
    lastAt[kind] = at;
    hits += 1;
    const loud = Math.min(1, event.speed / LOUD_HIT[kind]);
    if (kind === "disc") {
      sounds.push({ sound: "carromClack", at, variant: clackTake, volume: volume * (0.25 + 0.75 * loud) });
      clackTake = (clackTake + 1) % 4;
    } else {
      sounds.push({ sound: "carromWall", at, volume: volume * (0.3 + 0.7 * loud) });
    }
  }

  const settled = frames.slideMs;
  if (shot.foul) {
    sounds.push({ sound: "carromFoul", at: settled, volume });
    if (actor === "mine") haptics.push({ haptic: "carromFoul", at: settled });
  }
  if (shot.queen === "covered") {
    sounds.push({ sound: "carromCovered", at: settled, volume });
    if (actor === "mine") haptics.push({ haptic: "carromCovered", at: settled });
  } else if (shot.queen === "returned") {
    sounds.push({ sound: "carromQueenBack", at: settled + (shot.foul ? 250 : 0), volume });
    if (actor === "mine" && !shot.foul) haptics.push({ haptic: "carromQueenBack", at: settled });
  }
  return { sounds: sounds.sort((a, b) => a.at - b.at), haptics: haptics.sort((a, b) => a.at - b.at) };
}

/** Whether `seat` is this phone's own seat, another player's, or this phone only watches. */
export const actorOf = (seat: CarromSeat, mySeat: CarromSeat | null): Actor => (mySeat === null ? "watching" : seat === mySeat ? "mine" : "theirs");
