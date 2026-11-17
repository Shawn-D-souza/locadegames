import { LudoScreen } from "../../../../src/web/games/ludo/LudoScreen";
import { LUDO_CONFIG } from "../../../../src/shared/games/ludo/config";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { scriptParty, spacedBefore, stateAt, useClipSeconds } from "./script";

/**
 * Ludo, a flash: Ana rolls a 3, picks her pawn 3 squares behind Leo's, and it lands on him on the beat, sending him
 * home. The game so far, found by playing games through the rules: a number is a roll, `pN` a pick of pawn N.
 */
const SO_FAR = (
  "4 1 4 6 p3 2 4 5 3 6 p1 3 p1 3 2 1 3 p1 3 5 2 2 p1 3 4 5 2 p1 4 4 5 2 p3 3 5 6 p0 5 1 p1 3 2 1 5 p3 1 2 1 4 p3 2 6 p2 3 2 5 p3 6 p2 6 " +
  "p3 6 1 1 6 p1 6 p2 6 5 p2 5 p3 1 6 p0 3 1 p1 2 p2 4 4 1 5 p2 2 p1 2 6 p1 1 p2 4 2 p1 1 1 p1 5 4 p1 4 4 p1 5 2 p2 6 p3 1 2 p1 6 p1 5 6 " +
  "p0 2 p2 5 5 p1 1 1 p1 4 2 p2 2 6 p3 4 p2 2 3 p1 2 2 p3 6 p0 2 p0 1 p3 3 p1 1 5 p0 6 p2 3 p3 3 p1 4 5 5 p0 2 p2 4 p1 2 3 p1 4 p2 3 p2 1 " +
  "6 p2 4 p2 1 1 p3 1 p2 2 p2 2 4 p3 1 p1 2 p2 1 4 p2 5 p1 1 p2 6 p0 6 p0 3 p1"
)
  .split(" ")
  .map((m) => (m.startsWith("p") ? { pawn: Number(m.slice(1)) } : { die: Number(m) }));
const DIE = 3;
const PAWN = 3;
const F = cueSeconds("flash_ludo");
/** Picked so the pawn lands on Leo's just after the beat (a hop a square); rolled a while before. */
const PICKED = F + 0.1 - (DIE * LUDO_CONFIG.hopMs) / 1000;
const ROLLED = F - 3;
const at = spacedBefore(SO_FAR.length, ROLLED - 4, 4);
const SCRIPT = scriptParty("ludo", [...SO_FAR.map((m, i) => [m, at(i)] as const), [{ die: DIE }, ROLLED], [{ pawn: PAWN }, PICKED]]);

export function LudoClip() {
  useVideoClock(CLIPS.ludo.from);
  const party = stateAt(useClipSeconds("ludo"), SCRIPT);
  return (
    <AppScreen>
      <LudoScreen party={party} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
