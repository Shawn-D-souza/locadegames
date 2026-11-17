import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ChatAvatar, ChatBubble } from "../parts/ChatBubble";
import { PopText } from "../parts/PopText";
import { TextCard } from "../parts/TextCard";
import { cameraTransform, CENTER } from "../parts/camera";
import { CHAT } from "../frames/ChatFrame";
import { ZOE } from "../cast";
import { cue, seconds, type CueName } from "../timing";
import { Arrival, Invite } from "./Act1Chat";

/**
 * Act 4 (0:38–0:46): the group chat from the start again, now as Zoe sees it: a friend out of town, scrolling down
 * past everything the others said to the bottom. She's bored and sad to miss out; Ben tells her it's online; Ana says
 * the same link works from there; she's joining. Then PLAY WITH YOUR FRIENDS. → ANYTIME. → ANYWHERE. (the chat moving
 * up to make room), and the chat scrolls away for the logo. Frames count from the chat's entrance.
 */

const START = cue("backToPhones") - seconds(0.4);
const at = (name: CueName) => cue(name) - START;
const atSeconds = (s: number) => seconds(s) - START;

/** The new messages, each on a beat (owner-approved wording). */
const NEW = [
  { from: ZOE, text: "ugh i'm so bored", at: at("backToPhones") },
  { from: ZOE, text: "sad i'm not in town with you guys", at: atSeconds(39) },
  { from: 1, text: "you can still play! it's online", at: at("territoryWin") },
  { from: 0, text: "same link, join from there", at: atSeconds(41) },
  { from: ZOE, text: "wait really?? joining now!", at: at("championCard") },
];
const THREAD = [...CHAT.map((m) => m.from), 0, ...NEW.map((m) => m.from)];
/** A slow drift in while the chat is read, as in Act 1. */
const DRIFT = 0.04;

/** Two words in cards side by side, each popping on at its own moment; the first starts alone in the middle, then slides over. */
function PopWords({ words, second, to }: { words: [{ text: string; from: number }, { text: string; from: number }]; second: number; to: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < words[0].from - 1 || frame > to + seconds(0.3)) return null;
  const leave = Easing.in(Easing.back(1.6))(interpolate(frame, [to, to + seconds(0.25)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const slide = spring({ frame: frame - words[1].from, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 82, display: "flex", justifyContent: "center", gap: 36 }}>
      {words.map((w, i) => {
        const grow = spring({ frame: frame - w.from, fps, config: { damping: 12, stiffness: 210, mass: 0.7 } });
        const shift = i === 0 ? ((second + 36) / 2) * (1 - slide) : 0;
        return (
          <TextCard key={w.text} size={84} style={{ transform: `translateX(${shift}px) scale(${Math.max(0, grow * (1 - leave))}) rotate(${(1 - grow) * -6}deg)`, boxShadow: `0 8px 0 #1d1955` }}>
            {w.text}
          </TextCard>
        );
      })}
    </div>
  );
}

export function Act4Chat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Scrolling down to the bottom of the chat as it comes in; scrolling away for the logo.
  const enter = Easing.out(Easing.cubic)(interpolate(frame, [0, seconds(0.4)], [0, 1], clamp));
  const leaveAt = at("logoX") - seconds(0.2);
  const leave = Easing.in(Easing.cubic)(interpolate(frame, [leaveAt, leaveAt + seconds(0.35)], [0, 1], clamp));
  // The chat moves up to make room for the line under it.
  const lift = spring({ frame: frame - (at("textPlayWithFriends") - seconds(0.3)), fps, config: { damping: 16, stiffness: 160 } });
  const drift = 1 + DRIFT * Easing.inOut(Easing.sin)(interpolate(frame, [0, at("logoX")], [0, 1], clamp));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: cameraTransform({ scale: drift, focus: CENTER }), transformOrigin: "0 0" }}>
        <div
          style={{
            position: "absolute",
            inset: "0 330px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 14,
            paddingBottom: 70 + 230 * lift,
            transform: `translateY(${(1 - enter) * 700 - leave * 1400}px)`,
          }}
        >
          {CHAT.map((m, i) => (
            <ChatBubble key={i} from={m.from} first={THREAD[i - 1] !== m.from} last={m.from !== 0 && THREAD[i + 1] !== m.from}>
              {m.text}
            </ChatBubble>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "flex-end", paddingTop: 10 }}>
            <Invite />
            <ChatAvatar from={0} />
          </div>
          {NEW.map((m, k) => {
            const i = CHAT.length + 1 + k;
            return (
              <Arrival key={k} at={m.at} from={m.from}>
                <ChatBubble from={m.from} first={THREAD[i - 1] !== m.from} last={THREAD[i + 1] !== m.from}>
                  {m.text}
                </ChatBubble>
              </Arrival>
            );
          })}
        </div>
      </AbsoluteFill>
      <PopText from={at("textPlayWithFriends")} to={at("textAnytime") - seconds(0.2)}>
        Play with your friends.
      </PopText>
      <PopWords
        words={[
          { text: "Anytime.", from: at("textAnytime") },
          { text: "Anywhere.", from: at("textAnywhere") },
        ]}
        second={530}
        to={at("logoX") - seconds(0.15)}
      />
    </AbsoluteFill>
  );
}
