import { ULTIMATE_LOOK } from "../../../../src/web/games/ultimate/look";
import { cueSeconds } from "../../timing";
import { MatchClip, scriptMatch } from "./match";
import { spacedBefore } from "./script";

/**
 * Ultimate Tic-tac-toe, a flash: Ana's X has just won the middle small board as it cuts in, the camera on that board
 * alone as if it were tic-tac-toe; its line slashes through, and as the camera pulls out to the whole board, its big X
 * stamps on (the app's: 650 ms after the mark).
 */
const SO_FAR = [36,3,31,39,28,12,33,54,8,79,66,27,6,55,10,13,40,44,72,4,38,24,58,43,69,62,74,19,9,5,47,20,23,48,29,26,77,52,70,67];
const WIN = 37;
const F = cueSeconds("flash_ticTacToeToUltimate");
const at = spacedBefore(SO_FAR.length, F - 2, 2);
const SCRIPT = scriptMatch("ultimate", [...SO_FAR.map((c, i) => [c, at(i)] as const), [WIN, F - 0.35]]);

export function UltimateClip() {
  return <MatchClip clip="ultimate" script={SCRIPT} look={ULTIMATE_LOOK as never} />;
}
