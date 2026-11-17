import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Dots } from "../look";
import { ChatFrame } from "./ChatFrame";

/** A slow camera push across the chat, to see how the dots behave in motion. */
export function DotsTest({ dots }: { dots: Dots }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: `translate(${-120 * t}px, ${-60 * t}px) scale(${1 + 0.35 * t}) rotate(${-1.5 * t}deg)`, transformOrigin: "60% 70%" }}>
      <ChatFrame dots={dots} />
    </AbsoluteFill>
  );
}
