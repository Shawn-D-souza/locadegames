import { useEffect, useRef } from "react";
import type { PoolSeat } from "../../../shared/games/pool/types";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { shotCues } from "./shotCues";
import type { ShotPlayback } from "./useShotPlayback";

interface PoolSoundOptions {
  /** The shot playing out on screen. */
  playback: ShotPlayback | null;
  /** Your seat, or null watching. */
  mySeat: PoolSeat | null;
  /** It's your shot now, newly (not again after potting one of yours: that's felt as it drops). */
  myTurn: boolean;
  /** Your shot's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over and its last shot has played out. */
  ending: EndingTone | null;
  /** One game from the next. */
  gameKey: number;
}

/**
 * The game's sounds and feels, timed to the table on screen: each shot as it plays out (`shotCues`: the strike, the
 * clicks and cushions, the drops, a foul or going out; a shot that reached this phone late plays from where it is),
 * your shot coming round (felt), your last seconds, the ending.
 */
export function usePoolSounds({ playback, mySeat, myTurn, countdown, ending, gameKey }: PoolSoundOptions) {
  const shot = playback?.shot ?? null;
  const frames = playback?.frames ?? null;
  const startedAt = playback?.startedAt ?? 0;
  useEffect(() => {
    if (!shot || !frames) return;
    const actor = mySeat === null ? "watching" : shot.seat === mySeat ? "mine" : "theirs";
    const { sounds, haptics } = shotCues(shot, frames, actor, mySeat);
    // Started late (the shot reached this phone after it began): from where it is now.
    const late = Math.max(0, Date.now() - startedAt);
    const handle = playSoundSequence(sounds.filter((s) => s.at >= late).map((s) => ({ ...s, at: s.at - late })));
    const due = haptics.filter((h) => h.at >= late).map((h) => ({ ...h, at: h.at - late }));
    if (due.length > 0) playHapticSequence(due);
    return () => handle.stop();
    // Once per shot: the seat doesn't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, frames, startedAt]);

  const wasMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMine.current) playHaptic("poolYourTurn");
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
