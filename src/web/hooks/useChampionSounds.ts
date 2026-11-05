import { useEffect } from "react";
import type { PlayerId } from "../../shared/rooms/types";
import { playSoundSequence } from "../services/soundPlayer";
import { championSteps } from "../sound/cues/endingCues";

/** The results screen: the champion's fanfare (or a warm chord for someone else's title). */
export function useChampionSounds(championIds: readonly PlayerId[], myId: PlayerId) {
  const key = championIds.join(",");
  useEffect(() => {
    const handle = playSoundSequence(championSteps(key === "" ? [] : key.split(",").map(Number), myId));
    return () => handle.stop();
  }, [key, myId]);
}
