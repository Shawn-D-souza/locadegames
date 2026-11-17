import { FOURINAROW_LOOK } from "../../../../src/web/games/fourinarow/look";
import { cueSeconds } from "../../timing";
import { MatchClip, scriptMatch } from "./match";
import { spacedBefore } from "./script";

/**
 * 4 in a Row, a flash: Ana's disc has just made four on a diagonal as it cuts in, and the win line slashes through on
 * the beat (the game found by playing games through the rules).
 */
const SO_FAR = [4, 5, 4, 5, 1, 0, 2, 3, 2, 1, 1, 0, 3, 1, 5, 1, 1, 3, 3, 6, 6, 6, 5, 6];
const WIN = 4;
const F = cueSeconds("flash_fourInARow");
const at = spacedBefore(SO_FAR.length, F - 2, 2);
const SCRIPT = scriptMatch("fourinarow", [...SO_FAR.map((c, i) => [c, at(i)] as const), [WIN, F - 0.6]]);

export function FourInARowClip() {
  return <MatchClip clip="fourInARow" script={SCRIPT} look={FOURINAROW_LOOK as never} />;
}
