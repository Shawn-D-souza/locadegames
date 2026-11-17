import { CarromScreen } from "../../../../src/web/games/carrom/CarromScreen";
import { nearestFit } from "../../../../src/web/games/carrom/strikerGrip";
import { sideFrame } from "../../../../src/shared/games/carrom/board";
import { playPartyMove, startParty } from "../../../../src/shared/party/party";
import type { Party } from "../../../../src/shared/party/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { videoMs } from "../../clock/clock";
import { cueSeconds } from "../../timing";
import { CLIPS } from "../clips";
import { inJoinOrder, ok, PLAYERS, stateAt, useClipSeconds } from "./script";

/**
 * Carrom, a game well under way, on Ana's phone: she flicks on the beat and sinks the queen and covers her in the same
 * shot, three coins in 1.3 s (+80). The game so far and her shot were found by playing games through the game's own rules
 * and physics: each earlier shot is [seat, at, dx, dy, power].
 */
const SO_FAR: [number, number, number, number, number][] = [
  [0,13.236673870123923,0.5288542936952817,-0.8487126345472092,0.5330302860820666],
  [1,17.91443331632763,-0.8745374121450498,-0.48495805463837727,0.6705508896848187],
  [2,-3.3899943670257926,0.5081044950186805,0.8612954325559911,0.9781265582423657],
  [3,-10.361328064464033,0.9995327264313218,0.03056679232056249,0.5614124692510813],
  [0,10.93354077078402,-0.062259834589231844,-0.99805997464928,0.7365199369378388],
  [1,23.460271549411118,-0.8107251832346241,0.5854269188115501,0.8361599621130154],
  [2,27.62610296253115,-0.16642747271736913,0.9860536984996858,0.9647859712131321],
  [3,-3.250054009258747,0.9291651202723962,-0.36966495542475153,0.8132493599550799],
  [0,0.0740697467699647,-0.026469701566746898,-0.9996496160650328,0.649093760875985],
  [1,12.936602826230228,-0.735208527064895,-0.677841000331986,0.9488004824379459],
  [2,15.518353963270783,-0.13522329478859754,0.9908151495342187,0.9801447652280331],
  [2,26.768246018327773,-0.3992902045520437,0.9168245920288063,0.6796313857194036],
  [2,2.3091471707448363,-0.057043883094479504,0.9983716719746727,0.5042521230643615],
  [3,8.675732198171318,0.9405161555587526,0.3397489678173935,0.6099880039691925],
  [0,-0.2686468558385968,0.5031809847416049,-0.8641810554475658,0.8016904245596379],
  [0,-3.7856178916990757,-0.17772263361693963,-0.9840806194109601,0.8706800064537674],
];
/** Ana's shot: from where her striker stands (the middle of her baseline, or the nearest place it fits), this far off straight up (radians), this hard. */
const ANGLE = 0.52;
const POWER = 0.85;
const FLICK = cueSeconds("carrom");

// The earlier shots 5 s apart, the last a few seconds before Ana's (so her turn's clock is fresh).
const shotAt = (i: number) => videoMs(FLICK - 4 - (SO_FAR.length - i) * 5);
let party = inJoinOrder(startParty("carrom", PLAYERS, shotAt(-1), 1) as Party<"carrom">);
SO_FAR.forEach(([seat, at, dx, dy, power], i) => {
  party = ok(playPartyMove(party, seat as PlayerId, { at, dx, dy, power }, shotAt(i), 7));
});
const before = party;
const { forward, right } = sideFrame(0);
const shot = {
  at: nearestFit(before.game.coins, 0, 0) ?? 0,
  dx: forward.x * Math.cos(ANGLE) + right.x * Math.sin(ANGLE),
  dy: forward.y * Math.cos(ANGLE) + right.y * Math.sin(ANGLE),
  power: POWER,
};
const after = ok(playPartyMove(before, 0 as PlayerId, shot, videoMs(FLICK), 7));
const SCRIPT = [
  { at: 0, state: before },
  { at: FLICK, state: after },
];

/** Carrom on Ana's phone held sideways, through her shot. */
export function CarromClip() {
  useVideoClock(CLIPS.carrom.from);
  const p = stateAt(useClipSeconds("carrom"), SCRIPT);
  return (
    <AppScreen>
      <CarromScreen party={p} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} lastError={null} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
