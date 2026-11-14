import { useEffect, useRef } from "react";
import { boardFor, homeProgress } from "../../../shared/games/ludo/board";
import type { LudoAction } from "../../../shared/games/ludo/types";
import type { PlayerId } from "../../../shared/rooms/types";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { actionCues } from "./actionCues";

interface LudoSoundOptions {
  /** The action playing out on screen, from the moment it arrives. */
  action: LudoAction | null;
  /** Player id of each seat. */
  seatIds: readonly PlayerId[];
  /** Your seat, or null watching. */
  mySeat: number | null;
  /** It's your roll now, newly (not again after a 6, a capture or a pawn home: those are felt as they happen). */
  myTurn: boolean;
  /** Your turn's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over and its last action has played out. */
  ending: EndingTone | null;
  /** One game from the next. */
  gameKey: number;
}

/**
 * The game's sounds and feels, timed to the board on screen: each action as it plays out (`actionCues`: the die, the
 * hops, a capture, a pawn home; your own felt, and your pawn captured), your roll coming round (felt), your last
 * seconds, the ending.
 */
export function useLudoSounds({ action, seatIds, mySeat, myTurn, countdown, ending, gameKey }: LudoSoundOptions) {
  useEffect(() => {
    if (!action) return;
    const actor = mySeat === null ? "watching" : action.seat === mySeat ? "mine" : "theirs";
    const { sounds, haptics } = actionCues(action, actor, seatIds[action.seat]!, mySeat, homeProgress(boardFor(seatIds.length)));
    playSoundSequence(sounds);
    if (haptics.length > 0) playHapticSequence(haptics);
    // Once per action: the seats' players don't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const wasMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMine.current) playHaptic("ludoYourTurn");
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
