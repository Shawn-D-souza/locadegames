import { DotsBoxesScreen } from "../../../../src/web/games/dotsboxes/DotsBoxesScreen";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { scriptParty, spacedBefore, stateAt, useClipSeconds } from "./script";

/** Dots & Boxes, a flash: Ana's line on the beat closes two boxes at once (the lines so far found by playing games through the rules). */
const SO_FAR = [61,26,23,45,74,52,40,29,65,7,64,14,36,72,47,10,56,31,82,1,78,3,11,16,0,80,38,55,83,18,39,27,2,50,15,6,76,67,28,70,58,79,32,37,73,33,8,81,44,34,75,35,69,43,68,41,51,25,42,22,13,60,19,71,57,12,49,46,20,59,21,9,4,53,54,62];
const TWO = 17;
const F = cueSeconds("flash_dotsBoxes");
const at = spacedBefore(SO_FAR.length, F - 1.2, 2);
const SCRIPT = scriptParty("dotsboxes", [...SO_FAR.map((l, i) => [l, at(i)] as const), [TWO, F]]);

export function DotsBoxesClip() {
  useVideoClock(CLIPS.dotsBoxes.from);
  const party = stateAt(useClipSeconds("dotsBoxes"), SCRIPT);
  return (
    <AppScreen>
      <DotsBoxesScreen party={party} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} lastError={null} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
