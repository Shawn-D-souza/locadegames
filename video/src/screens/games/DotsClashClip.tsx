import { DotsClashScreen } from "../../../../src/web/games/dotsclash/DotsClashScreen";
import { DOTSCLASH_CONFIG } from "../../../../src/shared/games/dotsclash/config";
import { playPartyMove, startParty } from "../../../../src/shared/party/party";
import type { Party } from "../../../../src/shared/party/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { videoMs } from "../../clock/clock";
import { BEAT, cueSeconds } from "../../timing";
import { FRAME } from "../../look";
import { CLIPS } from "../clips";
import { inJoinOrder, ok, PLAYERS, stateAt, useClipSeconds } from "./script";

/**
 * Dots Clash, late in a game, on Ana's phone: one tap of hers sets off a chain of 10 waves that takes 37 cells and
 * explodes on the beats (the music's eight chain notes). The game so far was found by playing games through the game's
 * own rules: each move is [seat, cell], the four secret picks first.
 */
const SO_FAR: [number, number][] = [
  [0,  1], [1,  5], [2,  29], [3,  33], [0,  1], [1,  5], [2,  29], [3,  33], [0,  1], [1,  5], [2,  29], [3,  33], [0,  1], [1,  5], [2,  29], [3,  33],
  [0,  0], [1,  4], [2,  22], [3,  40], [0,  0], [1,  47], [2,  36], [3,  32], [0,  2], [1,  12], [2,  30], [3,  32], [0,  43], [1,  4], [2,  28], [3,  34],
  [0,  43], [1,  4], [2,  28], [3,  26], [0,  2], [1,  11], [2,  36], [3,  40], [0,  2], [1,  6], [2,  30], [3,  34], [0,  44], [1,  12], [2,  22], [3,  26],
  [0,  8], [1,  46], [2,  36], [3,  40], [0,  8], [1,  5], [2,  29], [3,  41], [0,  3], [1,  5], [2,  22], [3,  41], [0,  9], [1,  11], [2,  15], [3,  39],
  [0,  9], [1,  6], [2,  21], [3,  39], [0,  8], [1,  46], [2,  36], [3,  33], [0,  10], [1,  12], [2,  23], [3,  34], [0,  16], [1,  13], [2,  44], [3,  25],
  [0,  16], [1,  8], [2,  45], [3,  28], [0,  16], [1,  12], [2,  43], [3,  28], [0,  14], [1,  38], [2,  2], [3,  39], [0,  14], [1,  0], [2,  2], [3,  31],
  [0,  30], [1,  6], [2,  44], [3,  41],
];
const TAP = 14;

/** The chain's first burst on the first chain note; the tap lands just before it (the game's landing). */
const FIRST_BURST = cueSeconds("chainWave1");
const TAPPED = FIRST_BURST - DOTSCLASH_CONFIG.landMs / 1000;
/** From the first burst, the game runs at the pace that puts a wave on every beat. */
const PACE = DOTSCLASH_CONFIG.waveMs / 1000 / (BEAT / FRAME.fps);
const warp = (s: number) => (s <= FIRST_BURST ? s : FIRST_BURST + (s - FIRST_BURST) * PACE);

const moveAt = (i: number) => videoMs(TAPPED - 3 - (SO_FAR.length - i) * 2);
let party = inJoinOrder(startParty("dotsclash", PLAYERS, moveAt(-1), 1) as Party<"dotsclash">);
SO_FAR.forEach(([seat, cell], i) => {
  party = ok(playPartyMove(party, seat as PlayerId, cell, moveAt(i), 7));
});
const before = party;
const after = ok(playPartyMove(before, 0 as PlayerId, TAP, videoMs(TAPPED), 7));
const SCRIPT = [
  { at: 0, state: before },
  { at: TAPPED, state: after },
];

/** Dots Clash on Ana's phone held sideways, through her chain. */
export function DotsClashClip() {
  useVideoClock(CLIPS.dotsClash.from, warp);
  const p = stateAt(useClipSeconds("dotsClash"), SCRIPT);
  return (
    <AppScreen>
      <DotsClashScreen party={p} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
