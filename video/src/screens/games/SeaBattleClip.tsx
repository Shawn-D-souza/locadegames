import { SEABATTLE_LOOK } from "../../../../src/web/games/seabattle/look";
import { cueSeconds } from "../../timing";
import { MatchClip, scriptMatch } from "./match";
import { spacedBefore } from "./script";

/** Sea Battle, a flash: Ana's cannonball sinks one of Leo's ships on the beat. The fleets, then every shot (a hit fires again). */
const FLEETS = [
  [{ cell: 26, vertical: false }, { cell: 0, vertical: false }, { cell: 36, vertical: false }, { cell: 60, vertical: false }, { cell: 56, vertical: false }],
  [{ cell: 10, vertical: true }, { cell: 29, vertical: true }, { cell: 38, vertical: true }, { cell: 16, vertical: true }, { cell: 62, vertical: false }],
];
const SO_FAR = [29,21,25,28,31,30,49,37,38,46,39,42,54,45,53,63,62,7,19,22,14,8,47,34,33,2,10,42,41,3,59,50,60,1,21,25,45,43,9,6,0,52,35,61,54,26,27,53,18];
const SINK = 10;
const F = cueSeconds("flash_seaBattle");
/** The ball flies a cannon's turn and its flight (0.8 s): fired so it lands just after the beat. Shots before it far enough apart to play out (the boards trade places after a miss). */
const FIRED = F - 0.75;
const at = spacedBefore(SO_FAR.length, FIRED - 3, 2.5);
const placed = at(0) - 4;
const SCRIPT = scriptMatch("seabattle", [
  [{ place: FLEETS[0] }, placed, 0],
  [{ place: FLEETS[1] }, placed + 0.5, 1],
  ...SO_FAR.map((cell, i) => [{ fire: cell }, at(i)] as const),
  [{ fire: SINK }, FIRED],
]);

export function SeaBattleClip() {
  return <MatchClip clip="seaBattle" script={SCRIPT} look={SEABATTLE_LOOK as never} />;
}
