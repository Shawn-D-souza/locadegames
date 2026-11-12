import type { SoundName, SoundStep } from "../sound/soundBook";
import type { HapticStep } from "./definition";
import type { HapticName } from "./hapticBook";

/**
 * What each sound feels like: playing the sound plays this too (with sound on or off), so feels land on the same
 * moments and stay in time with the animations. A sound that isn't listed is felt as nothing, on purpose: a friend's
 * small actions, others' events, keystrokes and ticking numbers stay out of your hand.
 */
export const HAPTIC_OF_SOUND: Partial<Record<SoundName, HapticName>> = {
  // The interface.
  mainButtonPress: "buttonPress",
  secondButtonPress: "buttonPress",
  iconButtonPress: "smallPress",
  backButtonPress: "smallPress",
  cardPress: "smallPress",
  switchOn: "smallPress",
  switchOff: "smallPress",
  volumeStep: "smallPress",
  popupClose: "smallPress",
  roomCodeComplete: "smallNews",
  warningPopupOpen: "warning",
  actionRefused: "refused",
  connectionDropped: "warning",
  connectionRestored: "smallNews",
  errorScreen: "failure",
  serversFullScreen: "failure",
  // The room.
  gameSuggested: "smallPress",
  gameUnsuggested: "smallPress",
  playerJoined: "smallNews",
  youBecameHost: "smallNews",
  gameStarting: "gameStarting",
  // Playing.
  countdownTick: "countdownTick",
  countdownGo: "go",
  timerTick: "clockTick",
  // Endings. Marks aren't here: `useMatchSounds` and `BoardCell` choose by whose mark it is.
  boardThump: "thump",
  winLineDrawnWithSparks: "winLine",
  matchWinFanfare: "matchWon",
  matchLossSting: "matchLost",
  matchDrawShrug: "matchDrawn",
  championFanfare: "champion",
  championFanfareShared: "champion",
  championAnnounced: "smallNews",
  // Ultimate Tic-tac-toe: winning a small board (others winning one, or one filling up, isn't felt).
  ultimateYouClaimedBoard: "ultimateBoardClaimed",
  // Head Crash: your own car's weight, a pad throwing it, and the hit that ends your round (rolling, the fan's air, the
  // lift, the water's wash and warning, and hits in a match you watch, aren't felt).
  headCrashLanding: "headCrashLanding",
  headCrashKnock: "headCrashKnock",
  headCrashPadThrow: "headCrashPadThrow",
  headCrashCarBump: "headCrashCarBump",
  headCrashYouScored: "headCrashYouScored",
  headCrashYouWereHit: "headCrashYouWereHit",
  headCrashBothHeadsHit: "headCrashBothHeadsHit",
  // Territory.
  territoryLeftLand: "territoryLeftLand",
  territoryCaptureSmall: "territoryCaptureSmall",
  territoryCaptureMedium: "territoryCaptureMedium",
  territoryCaptureLarge: "territoryCaptureLarge",
  territoryYouKnockedSomeoneOut: "territoryKnockedSomeoneOut",
  territoryYouAreOut: "territoryYouAreOut",
  territoryHeadBump: "territoryHeadBump",
  territoryWallBump: "territoryWallBump",
  territoryMatchOver: "thump",
  territoryWinnerHeadDrop: "territoryWinnerHeadDrop",
};

/** A sequence of sounds as what it feels like, at the same times. */
export function hapticStepsOf(steps: readonly SoundStep[]): HapticStep<HapticName>[] {
  return steps.flatMap((step) => {
    const haptic = HAPTIC_OF_SOUND[step.sound];
    return haptic ? [{ haptic, at: step.at }] : [];
  });
}
