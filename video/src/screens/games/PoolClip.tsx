import { PoolScreen } from "../../../../src/web/games/pool/PoolScreen";
import { playPartyMove, startParty } from "../../../../src/shared/party/party";
import { POOL_CONFIG } from "../../../../src/shared/games/pool/config";
import { shotFrames } from "../../../../src/web/games/pool/shotFrames";
import type { Party } from "../../../../src/shared/party/types";
import type { PoolShotResult } from "../../../../src/shared/games/pool/types";
import type { PlayerId } from "../../../../src/shared/rooms/types";
import { AppScreen } from "../../parts/AppScreen";
import { useVideoClock } from "../../clock/useVideoClock";
import { videoMs } from "../../clock/clock";
import { CLIPS } from "../clips";
import { cueSeconds } from "../../timing";
import { FRAME } from "../../look";
import { inJoinOrder, ok, PLAYERS, stateAt, useClipSeconds } from "./script";

/**
 * Pool's break on the drop: Ana's full-power break; the cue strikes in the half beat of silence and the rack bursts on
 * the drop. This rack and aim (found by trying racks and aims through the game's own physics) drop three of her balls
 * in the first 1.3 s.
 */
const RACK = 40;
const AIM_OFF = -0.03;
const BURST = cueSeconds("poolBreak");

const before = inJoinOrder(startParty("pool", PLAYERS, videoMs(CLIPS.pool.from / FRAME.fps - 1), RACK) as Party<"pool">);
const cueBall = before.game.balls[0]!;
const { footSpotX, width } = POOL_CONFIG.table;
const aim = { dx: footSpotX - cueBall.x, dy: width / 2 + AIM_OFF * width - cueBall.y };
const length = Math.hypot(aim.dx, aim.dy);
const shot = { dx: aim.dx / length, dy: aim.dy / length, power: 1 };
const play = (at: number) => ok(playPartyMove(before, 0 as PlayerId, shot, videoMs(at), 7));
// The shot plays the same whenever it's sent: when the cue ball first meets the rack, after the cue's strike (the lead).
const firstHit = shotFrames(play(0).game.last as PoolShotResult).events.find((e) => e.kind === "ball")!.ms;
/** When the shot reaches the phones (seconds): the cue is drawn back, holds, strikes, and the rack bursts on the beat. */
export const POOL_SENT = BURST - (POOL_CONFIG.leadMs + firstHit) / 1000;
const after = play(POOL_SENT);

const SCRIPT = [
  { at: 0, state: before },
  { at: POOL_SENT, state: after },
];

/** Pool on Ana's phone held sideways, through the break. */
export function PoolClip() {
  useVideoClock(CLIPS.pool.from);
  const party = stateAt(useClipSeconds("pool"), SCRIPT);
  return (
    <AppScreen>
      <PoolScreen party={party} myId={0 as PlayerId} clockOffsetMs={0} send={() => {}} onQuit={() => {}} onLeave={() => {}} onContinue={() => {}} />
    </AppScreen>
  );
}
