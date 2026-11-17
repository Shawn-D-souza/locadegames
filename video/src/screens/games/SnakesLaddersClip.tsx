import { SnakesLaddersScreen } from "../../../../src/web/games/snakesladders/SnakesLaddersScreen";
import { SNAKESLADDERS_CONFIG } from "../../../../src/shared/games/snakesladders/config";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { scriptParty, spacedBefore, stateAt, useClipSeconds } from "./script";

/** Snakes & Ladders, a flash: Ana on 33 rolls a 3 and climbs the ladder from 36 to 64 on the beat. Everyone's dice so far, in turn. */
const SO_FAR = "4 1 4 6 6 2 4 5 3 6 3 3 1 3 2 1 3 1 3 5 2 2 1 3 4 5 2 2 4 4 5 2 5 3 5 6 2 5 1 2".split(" ").map(Number);
const DIE = 3;
const F = cueSeconds("flash_snakesLadders");
const { dieMs, settleMs, hopMs } = SNAKESLADDERS_CONFIG;
/** Rolled so the climb starts just before the beat: the die, its face, then the hops to the ladder's foot. */
const ROLLED = F - 0.1 - (dieMs + settleMs + DIE * hopMs) / 1000;
const at = spacedBefore(SO_FAR.length, ROLLED - 5, 5);
const SCRIPT = scriptParty("snakesladders", [...SO_FAR.map((die, i) => [{ die }, at(i)] as const), [{ die: DIE }, ROLLED]]);

export function SnakesLaddersClip() {
  useVideoClock(CLIPS.snakesLadders.from);
  const party = stateAt(useClipSeconds("snakesLadders"), SCRIPT);
  return (
    <AppScreen>
      <SnakesLaddersScreen party={party} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
