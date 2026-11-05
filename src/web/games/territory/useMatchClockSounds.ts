import { useEffect, useRef } from "react";
import { playSound } from "../../services/soundPlayer";
import { timerTake, timerVolume } from "../../sound/cues/clockCues";
import { TERRITORY_CLIENT_CONFIG } from "./config";

const HUD = TERRITORY_CLIENT_CONFIG.hud;

/** The start of play and the last seconds on the clock; keyed to the overlay, so they land with what it shows. */
export function useMatchClockSounds(countingDown: boolean, secondsLeft: number | null) {
  const wasCounting = useRef(false);
  useEffect(() => {
    if (wasCounting.current && !countingDown) playSound("countdownGo");
    wasCounting.current = countingDown;
  }, [countingDown]);
  useEffect(() => {
    if (!countingDown && secondsLeft !== null && secondsLeft > 0 && secondsLeft <= HUD.clockTicksFromS) {
      playSound("timerTick", { variant: timerTake(secondsLeft), volume: timerVolume(secondsLeft) });
    }
  }, [countingDown, secondsLeft]);
}
