import { useEffect } from "react";
import { playSound } from "../services/soundPlayer";
import { countdownTake } from "../sound/cues/clockCues";

/** Each new number of a 3-2-1 countdown ticks, climbing towards GO. */
export function useCountdownSounds(seconds: number) {
  useEffect(() => {
    if (seconds >= 1 && seconds <= 3) playSound("countdownTick", { variant: countdownTake(seconds) });
  }, [seconds]);
}
