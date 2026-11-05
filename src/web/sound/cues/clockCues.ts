import { COUNTDOWN_NOTES, TIMER_TAKES } from "../library/playingSounds";

/** Which take of `countdownTick` for "3, 2, 1": the climb always ends on the same note, right before GO. */
export const countdownTake = (seconds: number) => Math.max(0, COUNTDOWN_NOTES.length - seconds);

/** Which take of `timerTick` with this many seconds left: the last 5 get firmer, anything before stays on the first. */
export const timerTake = (secondsLeft: number) => Math.max(0, Math.min(TIMER_TAKES - 1, TIMER_TAKES - secondsLeft));

/** A clock's tick gets louder as time runs out. */
export const timerVolume = (secondsLeft: number) => Math.max(0.5, Math.min(1, 1 - (secondsLeft - 1) * 0.06));
