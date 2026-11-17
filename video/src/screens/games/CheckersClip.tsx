import { CHECKERS_LOOK } from "../../../../src/web/games/checkers/look";
import { cueSeconds } from "../../timing";
import { MatchClip, scriptMatch } from "./match";
import { spacedBefore } from "./script";

/** Checkers, a flash: Ana's double jump on the beat, two of Leo's pieces taken. Each move is [from, ...landings]. */
const SO_FAR = [[46,37],[17,24],[42,33],[24,42],[51,33],[19,28],[37,19],[10,28],[44,35],[28,42],[49,35],[1,10],[56,49],[12,19],[55,46],[21,30],[35,28],[19,37,55],[49,42],[14,21],[53,46],[30,37]];
const JUMP = [46, 28, 14];
const F = cueSeconds("flash_checkers");
const at = spacedBefore(SO_FAR.length, F - 1.2, 2);
const move = ([from, ...path]: number[]) => ({ from, path });
const SCRIPT = scriptMatch("checkers", [...SO_FAR.map((m, i) => [move(m), at(i)] as const), [move(JUMP), F - 0.05]]);

export function CheckersClip() {
  return <MatchClip clip="checkers" script={SCRIPT} look={CHECKERS_LOOK as never} />;
}
