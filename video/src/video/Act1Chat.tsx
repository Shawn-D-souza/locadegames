import { useRef, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RoomCode } from "../../../src/web/components/RoomCode";
import { TabCard } from "../../../src/web/components/TabCard";
import { GAME_LOOKS } from "../../../src/web/games/gameLooks";
import { ChatAvatar, ChatBubble } from "../parts/ChatBubble";
import { Page } from "../parts/Page";
import { blendCamera, cameraTransform, CENTER, type Camera } from "../parts/camera";
import { useSceneRect } from "../parts/useSceneRect";
import { CHAT } from "../frames/ChatFrame";
import { ROOM_CODE } from "../cast";
import { colors, FRAME, UI_ZOOM } from "../look";
import { cue } from "../timing";

const BUBBLE_CUES = ["bubble1", "bubble2", "bubble3", "bubble4", "bubble5"];
/** The code box fills this much of the frame's width when the push ends. */
const PUSH_FILL = 1.1;
/** A slow drift in while the chat is read, so the frame never sits dead still. */
const DRIFT = 0.04;

/** A message arriving: its row opens (the chat makes room), then it pops in from its sender's side. */
export function Arrival({ at, from, children }: { at: number; from: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = spring({ frame: frame - at, fps, config: { damping: 30, stiffness: 240 } });
  const pop = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 190, mass: 0.8 } });
  const mine = from === 0;
  return (
    <div style={{ display: "grid", gridTemplateRows: `${open}fr` }}>
      <div style={{ minHeight: 0, overflow: "clip", overflowClipMargin: 80 }}>
        <div
          style={{
            transform: `translateY(${(1 - pop) * 36}px) scale(${0.55 + 0.45 * pop})`,
            transformOrigin: mine ? "100% 100%" : "0% 100%",
            opacity: Math.min(1, pop * 2.5),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Ana's invite, with a handle on the room code box so the camera can dive into it. */
export function Invite({ codeRef }: { codeRef?: React.RefObject<HTMLDivElement | null> }) {
  const arts = (["ludo", "pool", "chess", "territory"] as const).map((id) => GAME_LOOKS[id].Art);
  return (
    <div style={{ zoom: UI_ZOOM * 0.8, width: 300 }}>
      <TabCard title="Join my room">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div ref={codeRef}>
            <RoomCode code={ROOM_CODE} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {arts.map((Art, k) => (
              <div key={k} style={{ width: 52, height: 52, overflow: "hidden", borderRadius: 12, border: `2px solid ${colors.ink}`, background: colors.white, padding: 3, boxSizing: "border-box" }}>
                <Art />
              </div>
            ))}
          </div>
        </div>
      </TabCard>
    </div>
  );
}

/**
 * Act 1 (0:00-0:08): the group chat. Messages arrive on the beat, one per friend, each on its sender's note; Ana's
 * invite lands; then the camera pushes into the room code until its digits fill the frame.
 */
export function Act1Chat() {
  const frame = useCurrentFrame();
  const rootRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const pushStart = cue("cameraPush");
  const pushEnd = cue("roomOpens");
  const drift = 1 + DRIFT * interpolate(frame, [0, pushStart], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const resting: Camera = { scale: drift, focus: CENTER };

  // The camera this frame (the code's place is measured under it, then aimed at)
  const camRef = useRef<Camera>(resting);
  const code = useSceneRect(rootRef, codeRef, camRef);
  const k = interpolate(frame, [pushStart, pushEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const target: Camera = code
    ? { scale: (FRAME.width * PUSH_FILL) / code.width, focus: { x: code.x + code.width / 2, y: code.y + code.height / 2 } }
    : resting;
  const cam = k > 0 ? blendCamera(resting, target, Easing.in(Easing.cubic)(k), Easing.inOut(Easing.cubic)(Math.min(1, k * 1.25))) : resting;
  camRef.current = cam;

  const inviteAt = cue("inviteCard");
  const { fps } = useVideoConfig();
  const invitePop = spring({ frame: frame - inviteAt, fps, config: { damping: 10, stiffness: 150 } });

  return (
    <AbsoluteFill ref={rootRef}>
      <Page />
      <AbsoluteFill style={{ transform: cameraTransform(cam), transformOrigin: "0 0" }}>
        <div style={{ position: "absolute", inset: "0 330px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {CHAT.map((m, i) => (
            <Arrival key={i} at={cue(BUBBLE_CUES[i]!)} from={m.from}>
              <ChatBubble from={m.from} first={CHAT[i - 1]?.from !== m.from} last={m.from !== 0 && CHAT[i + 1]?.from !== m.from}>
                {m.text}
              </ChatBubble>
            </Arrival>
          ))}
          <Arrival at={inviteAt} from={0}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "flex-end", paddingTop: 10 }}>
              <div style={{ transform: `rotate(${(1 - invitePop) * 8}deg)`, transformOrigin: "100% 100%" }}>
                <Invite codeRef={codeRef} />
              </div>
              <ChatAvatar from={0} />
            </div>
          </Arrival>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
