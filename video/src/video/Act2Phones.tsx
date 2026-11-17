import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Page } from "../parts/Page";
import { Phone, PHONE_SCREEN } from "../parts/Phone";
import { SCREEN_H, SCREEN_W, screenToScene, slotCenter, TILT } from "../parts/phoneRow";
import { PopText } from "../parts/PopText";
import { blendCamera, cameraTransform, REST, type Camera } from "../parts/camera";
import { CLIPS, clipFile } from "../screens/clips";
import { FRAME } from "../look";
import { cue, seconds, type CueName } from "../timing";
import { POOL_SENT } from "../screens/games/PoolClip";

/**
 * Act 2 (0:08–0:20): the code opens into Ana's room; her friends' phones arrive from the edges, one a beat, each
 * friend's bar popping onto every phone; Ana taps Territory; 3, 2, 1, GO and one match on four phones, each following
 * its own player. Then the others leave and Ana's phone turns sideways toward you, for the games to come.
 * Frames here count from the start of the act (the room opening).
 */

const START = cue("roomOpens");
const at = (name: CueName) => cue(name) - START;

/** Where each friend's phone comes in from: Ana's is there as the room opens; then the top, the bottom, the right. */
const ARRIVALS: { cue: CueName; from: { x: number; y: number } }[] = [
  { cue: "phone1", from: { x: 0, y: 0 } },
  { cue: "phone2", from: { x: 0, y: -1100 } },
  { cue: "phone3", from: { x: 0, y: 1100 } },
  { cue: "phone4", from: { x: 1300, y: 0 } },
];
/** A phone flies in over this long and lands on its beat. */
const FLY = seconds(0.42);

/**
 * Where the push from the chat lands on Ana's room screen (CSS px of the phone's screen, status bar included): its room
 * code, sized so its digits match the chat's code exactly (the chat's box is a little tighter round them).
 */
const ROOM_CODE = { x: 195, y: 203.3, width: 314 / 1.182 };
/** Act 1's push ends with the code this much wider than the frame. */
const PUSH_FILL = 1.1;
/** The dive: Ana's phone sideways, its screen this wide, in the middle of the frame (as the games will play in it). */
const SIDEWAYS_W = 1640;

/** What a phone's screen plays: the room filling up, then Territory. */
function PhoneScreen({ friend }: { friend: number }) {
  const room = CLIPS.room;
  const territory = CLIPS.territory;
  const fill = { width: "100%", height: "100%", display: "block" } as const;
  return (
    <>
      <Sequence from={room.from - START} durationInFrames={room.to - room.from} layout="none">
        <OffthreadVideo src={staticFile(clipFile("room", friend))} muted style={fill} />
      </Sequence>
      <Sequence from={territory.from - START} durationInFrames={territory.to - territory.from} layout="none">
        <OffthreadVideo src={staticFile(clipFile("territory", friend))} muted style={fill} />
      </Sequence>
    </>
  );
}

/**
 * Pool, the first of Act 3's games, lights up Ana's turned phone as its shot arrives (the cue drawn back), while the
 * phone settles: drawn sideways inside the upright phone, which is itself turned.
 */
function PoolArrives() {
  const sent = Math.round(POOL_SENT * FRAME.fps);
  const turned = { position: "absolute", left: (SCREEN_W - SCREEN_H) / 2, top: (SCREEN_H - SCREEN_W) / 2, width: SCREEN_H, height: SCREEN_W, transform: "rotate(90deg)" } as const;
  return (
    <Sequence from={sent - START} layout="none">
      <div style={turned}>
        <OffthreadVideo src={staticFile(clipFile("pool", 0))} trimBefore={sent - CLIPS.pool.from} muted style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </Sequence>
  );
}

export function Act2Phones() {
  const frame = useCurrentFrame();

  // The camera: from the room code, as close as the chat's push left it, back to the whole page as Ana's phone lands.
  const code = screenToScene(0, ROOM_CODE);
  const fromCode: Camera = { scale: (FRAME.width * PUSH_FILL) / (ROOM_CODE.width * (SCREEN_W / PHONE_SCREEN.width)), focus: code };
  const pull = interpolate(frame, [0, at("phone1")], [0, 1], { extrapolateRight: "clamp" });
  let cam = blendCamera(fromCode, REST, Easing.out(Easing.cubic)(pull), Easing.inOut(Easing.cubic)(pull));

  // The dive: the others leave, and the camera follows Ana's phone as it turns sideways to fill the frame.
  const diveStart = at("dive");
  const diveEnd = at("silence") - seconds(0.15);
  const dive = Easing.inOut(Easing.cubic)(interpolate(frame, [diveStart, diveEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const ana = slotCenter(0);
  const sideways: Camera = { scale: SIDEWAYS_W / (SCREEN_H), focus: ana };
  if (dive > 0) cam = blendCamera(cam, sideways, dive, Math.min(1, dive * 1.3));

  // Ana's phone starts upright, as the chat's code was, and settles into its tilt as the camera pulls back; it lands
  // with a small bump on her beat.
  const bump = frame >= at("phone1") ? Math.sin(Math.min(1, (frame - at("phone1")) / seconds(0.25)) * Math.PI) * 0.02 : 0;

  // The crossfade from the chat's push (a few frames) and the blank page the turned phone shows before the games.
  const fadeIn = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const blank = interpolate(frame, [diveStart + seconds(0.8), diveStart + seconds(1.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Page>
        <AbsoluteFill style={{ transform: cameraTransform(cam), transformOrigin: "0 0" }}>
          {ARRIVALS.map((arrival, i) => {
            const land = at(arrival.cue);
            const isAna = i === 0;
            if (!isAna && frame < land - FLY) return null;
            const fly = isAna ? 1 : Easing.out(Easing.back(1.1))(interpolate(frame, [land - FLY, land], [0, 1], { extrapolateRight: "clamp" }));
            // At the dive the others drop away, one after another.
            const leave = isAna ? 0 : Easing.in(Easing.cubic)(interpolate(frame, [diveStart + (i - 1) * 3, diveStart + (i - 1) * 3 + seconds(0.45)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
            const c = slotCenter(i);
            const x = arrival.from.x * (1 - fly);
            const y = arrival.from.y * (1 - fly) + leave * 1300;
            const tilt = isAna ? TILT[0]! * Easing.inOut(Easing.cubic)(pull) * (1 - dive) - 90 * dive : TILT[i]! * (0.4 + 0.6 * fly) + (1 - fly) * (i % 2 ? 8 : -8);
            const scale = 1 + (isAna ? bump : 0);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  zIndex: isAna ? 2 : 1,
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${tilt}deg) scale(${scale})`,
                }}
              >
                <Phone
                  width={SCREEN_W}
                  screen={
                    <>
                      <PhoneScreen friend={i} />
                      {isAna && blank > 0 && <AbsoluteFill style={{ background: "#F1F5F9", opacity: blank }} />}
                      {isAna && <PoolArrives />}
                    </>
                  }
                />
              </div>
            );
          })}
        </AbsoluteFill>
        <PopText from={at("textOwnPhone")} to={at("tapTerritory") - seconds(0.25)}>
          Everyone on their own phone.
        </PopText>
        <PopText from={at("textNoBots")} to={at("dive")}>
          No bots. Just your friends.
        </PopText>
      </Page>
    </AbsoluteFill>
  );
}
