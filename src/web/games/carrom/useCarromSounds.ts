import { useEffect, useRef } from "react";
import type { CarromSeat } from "../../../shared/games/carrom/types";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { localMs } from "./playbackClock";
import { actorOf, shotCues } from "./shotCues";
import type { ShotPlayback } from "./useShotPlayback";

/**
 * A sound or feel due this little while ago still plays, at once: the flick is due the moment you let go, but reaches
 * here only once the phone has worked the shot out (longer on a slow phone), and it must never be lost.
 */
const LATE_GRACE_MS = 400;

interface CarromSoundOptions {
  /** The shot playing out on screen. */
  playback: ShotPlayback | null;
  /** Your seat, or null watching. */
  mySeat: CarromSeat | null;
  /** It's your shot now, newly (not again after pocketing a coin: that's felt as it drops). */
  myTurn: boolean;
  /** Your shot's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over and its last shot has played out. */
  ending: EndingTone | null;
  /** One game from the next. */
  gameKey: number;
}

/**
 * The game's sounds and feels, timed to the board on screen: each shot as it plays out (`shotCues`, put on this phone's
 * clock: your own from the moment you let go; someone else's as it catches up, and from where it is if it arrived
 * late), your shot coming round (felt), your last seconds, the ending.
 */
export function useCarromSounds({ playback, mySeat, myTurn, countdown, ending, gameKey }: CarromSoundOptions) {
  const shot = playback?.shot ?? null;
  const frames = playback?.frames ?? null;
  const startedAt = playback?.startedAt ?? 0;
  const lag = playback?.lag ?? 0;
  const started = playback?.started ?? false;
  useEffect(() => {
    if (!shot || !frames || !started) return;
    const { sounds, haptics } = shotCues(shot, frames, actorOf(shot.seat, mySeat));
    const since = Math.max(0, Date.now() - startedAt);
    const onClock = <T extends { at: number }>(steps: T[]) =>
      steps.map((s) => ({ ...s, at: localMs(s.at, lag) - since })).filter((s) => s.at >= -LATE_GRACE_MS).map((s) => ({ ...s, at: Math.max(0, s.at) }));
    const handle = playSoundSequence(onClock(sounds));
    const due = onClock(haptics);
    if (due.length > 0) playHapticSequence(due);
    return () => handle.stop();
    // Once per shot: the seat doesn't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, frames, startedAt, lag, started]);

  const wasMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMine.current) playHaptic("carromYourTurn");
    wasMine.current = myTurn;
  }, [myTurn]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) playSound("timerTick", { variant: timerTake(countdown), volume: timerVolume(countdown) });
  }, [countdown]);

  useEffect(() => {
    if (ending === null) return;
    const handle = playSoundSequence(matchEndingSteps(ending, { lastMove: null, line: false }));
    return () => handle.stop();
  }, [ending, gameKey]);
}
