import { PHONE_SCREEN } from "../parts/Phone";
import { cue, seconds } from "../timing";

/** A flash's clip: from a little before its cue (`lead` s: the screen settled, and any move it plays out started after it) to the next one. */
function flash(at: string, next: string, lead = 1) {
  return { from: cue(at) - seconds(lead), to: cue(next) };
}

/**
 * The app's screens that move are rendered as clips first (at a real phone's size, 3x), then played inside the phones.
 * Each clip covers a stretch of the video; `from` / `to` are video frames, so a clip's frame 0 is the video's `from`.
 * A clip whose screen plays a game's moves starts a little before it shows, so its first move is seen arriving.
 */
export const CLIPS = {
  /** The room filling up: the code opens into Ana's room, then each friend's phone joins. */
  room: { from: cue("roomOpens"), to: cue("count3") },
  /** Territory: 3, 2, 1, the match, and on Ana's phone on through the dive. */
  territory: { from: cue("count3"), to: cue("poolBreak") },
  /** Act 3, on Ana's phone held sideways: Pool's break. */
  pool: { from: seconds(19.3), to: cue("carrom") },
  carrom: { from: cue("carrom") - seconds(0.3), to: cue("dotsClash") },
  dotsClash: { from: cue("dotsClash") - seconds(0.5), to: cue("headCrash") },
  headCrash: { from: cue("headCrash"), to: cue("chess") },
  chess: { from: cue("chess") - seconds(1), to: cue("flash_memory") },
  /** The flashes, a beat each. */
  memory: flash("flash_memory", "flash_ludo"),
  ludo: flash("flash_ludo", "flash_snakesLadders"),
  snakesLadders: flash("flash_snakesLadders", "flash_fourInARow", 3),
  fourInARow: flash("flash_fourInARow", "flash_seaBattle"),
  seaBattle: flash("flash_seaBattle", "flash_checkers"),
  checkers: flash("flash_checkers", "flash_dotsBoxes"),
  dotsBoxes: flash("flash_dotsBoxes", "flash_ticTacToeToUltimate"),
  ultimate: flash("flash_ticTacToeToUltimate", "gamesGrid"),
} as const;

export type ClipName = keyof typeof CLIPS;

/** The screen a clip is drawn at (CSS px): a phone upright, or held sideways for the games. */
export const SIDEWAYS = { width: PHONE_SCREEN.height, height: PHONE_SCREEN.width } as const;

export const clipLength = (clip: ClipName) => CLIPS[clip].to - CLIPS[clip].from;
/** The file a phone plays: `screens/<clip>-<friend>.mp4`. */
export const clipFile = (clip: ClipName, friend: number) => `screens/${clip}-${friend}.mp4`;
