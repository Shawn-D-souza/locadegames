import { useEffect, useRef } from "react";
import type { SnakesRoll } from "../../../shared/games/snakesladders/types";
import type { PlayerId } from "../../../shared/rooms/types";
import { playHaptic, playHapticSequence } from "../../services/hapticPlayer";
import { playSound, playSoundSequence } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { matchEndingSteps, type EndingTone } from "../../sound/cues/endingCues";
import { rollCues } from "./rollCues";

interface SnakesLaddersSoundOptions {
  /** The roll playing out on screen, from the moment it arrives. */
  roll: SnakesRoll | null;
  /** Player id of each seat. */
  seatIds: readonly PlayerId[];
  /** Your seat, or null watching. */
  mySeat: number | null;
  /** It's your roll now (once the last roll has played out). */
  myTurn: boolean;
  /** Your roll's last seconds, when showing. */
  countdown: number | null;
  /** Set once the game is over and its last roll has played out. */
  ending: EndingTone | null;
  /** One game from the next. */
  gameKey: number;
}

/**
 * The game's sounds and feels, timed to the board on screen: each roll as it plays out (`rollCues`: the die, the hops,
 * a ladder or a snake, getting home; only your own felt), your roll coming round (felt), your last seconds, the ending.
 */
export function useSnakesLaddersSounds({ roll, seatIds, mySeat, myTurn, countdown, ending, gameKey }: SnakesLaddersSoundOptions) {
  useEffect(() => {
    if (!roll) return;
    const roller = mySeat === null ? "watching" : roll.seat === mySeat ? "mine" : "theirs";
    const { sounds, haptics } = rollCues(roll, roller, seatIds[roll.seat]!);
    playSoundSequence(sounds);
    if (haptics.length > 0) playHapticSequence(haptics);
    // Once per roll: the seats' players don't change during a game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll]);

  // Your roll came round (not again after a 6: that one is felt with the 6).
  const wasMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !wasMine.current) playHaptic("snakesLaddersYourTurn");
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
