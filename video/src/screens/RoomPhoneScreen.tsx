import { Easing, interpolate, useCurrentFrame } from "remotion";
import { LobbyScreen } from "../../../src/web/screens/LobbyScreen";
import type { PlayerId } from "../../../src/shared/rooms/types";
import { AppScreen } from "../parts/AppScreen";
import { roomWith } from "../cast";
import { colors } from "../look";
import { cue, seconds } from "../timing";
import { CLIPS } from "./clips";

/** When each friend joins (video frames): Ana made the room, the others come in as their phones arrive. */
const JOINS = [cue("roomOpens"), cue("phone2"), cue("phone3"), cue("phone4")];
/** On Ana's phone the room scrolls down to the games, and she taps Territory (top right of the grid; CSS px, under the status bar). */
const SCROLL = 330;
const TERRITORY_TILE = { x: 278, y: 790 };

/** A finger's tap: a soft disc that presses in, then a ring opening out as it lets go. */
function Tap({ frame, x, y }: { frame: number; x: number; y: number }) {
  const at = cue("tapTerritory");
  const t = frame - at;
  if (t < -seconds(0.15) || t > seconds(0.5)) return null;
  const press = interpolate(t, [-seconds(0.15), 0, seconds(0.12)], [1.25, 0.9, 1], { extrapolateRight: "clamp" });
  const disc = interpolate(t, [-seconds(0.15), -seconds(0.05), seconds(0.15), seconds(0.3)], [0, 0.35, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = t < 0 ? 0 : Easing.out(Easing.cubic)(Math.min(1, t / seconds(0.45)));
  const disc_r = 34;
  return (
    <>
      <div style={{ position: "absolute", left: x - disc_r, top: y - disc_r, width: disc_r * 2, height: disc_r * 2, borderRadius: 999, background: colors.ink, opacity: disc, transform: `scale(${press})` }} />
      {t >= 0 && (
        <div style={{ position: "absolute", left: x - disc_r, top: y - disc_r, width: disc_r * 2, height: disc_r * 2, borderRadius: 999, border: `4px solid ${colors.ink}`, opacity: 1 - ring, transform: `scale(${1 + ring * 1.4})` }} />
      )}
    </>
  );
}

/** The real room screen as one friend's phone shows it, filling up as friends join (bars pop in as in the app). */
export function RoomPhoneScreen({ me, still = false }: { me: number; still?: boolean }) {
  const frame = useCurrentFrame() + CLIPS.room.from;
  const players = still ? 4 : Math.max(1, JOINS.filter((at) => frame >= at).length);
  const tap = cue("tapTerritory");
  const scroll = me === 0 && !still ? SCROLL * Easing.inOut(Easing.cubic)(interpolate(frame, [tap - seconds(0.9), tap - seconds(0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 0;
  return (
    <AppScreen statusBar>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-scroll}px)` }}>
        <LobbyScreen room={roomWith(players)} myId={me as PlayerId} send={() => {}} onLeave={() => {}} />
        {me === 0 && !still && <Tap frame={frame} x={TERRITORY_TILE.x} y={TERRITORY_TILE.y} />}
      </div>
    </AppScreen>
  );
}
