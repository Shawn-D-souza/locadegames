import { pointInLand } from "../../../shared/games/territory/geometry";
import type { Point } from "../../../shared/games/territory/types";
import type { PlayerId } from "../../../shared/rooms/types";
import type { EndingTone } from "../../sound/cues/endingCues";
import type { LoopPoint, SoundName, SoundStep } from "../../sound/soundBook";
import { TERRITORY_CLIENT_CONFIG } from "./config";
import type { MomentView, PlayerFrame } from "./engine/frame";

/** Which sound goes with what in a Territory match: pure decisions, so they can be tested. */

const SOUND = TERRITORY_CLIENT_CONFIG.sound;
const { hud: HUD, look: LOOK } = TERRITORY_CLIENT_CONFIG;

/** Which of the three capture sounds a piece of new land gets. */
export function captureSound(area: number): SoundName {
  if (area >= SOUND.captureLargeArea) return "territoryCaptureLarge";
  if (area >= SOUND.captureMediumArea) return "territoryCaptureMedium";
  return "territoryCaptureSmall";
}

/** How loud something this far from you is: full on screen, fading out, and silent well off screen. */
export function distanceVolume(distance: number): number {
  return Math.max(0, Math.min(1, (SOUND.hearNoneAt - distance) / (SOUND.hearNoneAt - SOUND.hearFullAt)));
}

/** Whether this point is on someone else's land. */
export function onRivalLand(head: Point, players: readonly Pick<PlayerFrame, "isMe" | "land">[]): boolean {
  return players.some((player) => !player.isMe && player.land.some((land) => pointInLand(land, head)));
}

/** How the trail sounds right now: `built` is 0 → 1 over a long time out. */
export function trailShape(onRival: boolean, built: number) {
  const { trailVolume, trailRate, trailOnRivalLand: rival, trailOpenCutoffHz } = SOUND;
  const volume = trailVolume.from + (trailVolume.to - trailVolume.from) * built;
  const rate = trailRate.from + (trailRate.to - trailRate.from) * built;
  return onRival
    ? { volume: volume * rival.volume, rate: rate * rival.rate, cutoffHz: rival.cutoffHz }
    : { volume, rate, cutoffHz: trailOpenCutoffHz };
}

/**
 * The trail's course from now (`built` so far, 0 → 1): a quick move to how it should sound now (a hard change would
 * click), then on in a straight line to fully built. The audio clock runs it, so nothing is set each frame.
 */
export function trailCourse(onRival: boolean, built: number): LoopPoint[] {
  const done = Math.min(1, Math.max(0, built));
  const at = (b: number, inSeconds: number): LoopPoint => {
    const { volume, rate } = trailShape(onRival, b);
    return { inSeconds, volume, rate };
  };
  const moveSeconds = SOUND.trailMoveMs / 1000;
  const course = [at(Math.min(1, done + SOUND.trailMoveMs / SOUND.trailBuildMs), moveSeconds)];
  if (done < 1) course.push(at(1, moveSeconds + ((1 - done) * SOUND.trailBuildMs) / 1000));
  return course;
}

/** Which sound someone going out makes, from your point of view (null: none). */
export function outSound(moment: Extract<MomentView, { kind: "out" }>, myId: PlayerId): SoundName | null {
  if (moment.id === myId) return moment.reason === "quit" ? null : "territoryYouAreOut";
  if (moment.reason === "quit") return "territoryPlayerQuit";
  if (moment.by === myId) return "territoryYouKnockedSomeoneOut";
  return "territoryPlayerBurst";
}

/** The ending on the arena, timed from when the match ended: the thump and pull-out, the winner's head dropping, then the same result sounds as every game. */
export function territoryEndingSteps(tone: EndingTone): SoundStep[] {
  const steps: SoundStep[] = [
    { sound: "territoryMatchOver", at: 0 },
    { sound: "territoryWinnerHeadDrop", at: LOOK.winnerHeadAtMs },
  ];
  if (tone === "win") steps.push({ sound: "matchWinFanfare", at: HUD.endTagAtMs });
  else if (tone === "lose") steps.push({ sound: "matchLossSting", at: HUD.endTagAtMs });
  else steps.push({ sound: "matchWatchedResult", at: HUD.endTagAtMs });
  return steps;
}
