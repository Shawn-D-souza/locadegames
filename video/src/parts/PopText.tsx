import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { seconds } from "../timing";
import { TextCard } from "./TextCard";

/** A big line of text that pops on (a springy grow) and pops off. */
export function PopText({ from, to, children }: { from: number; to: number; children: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from - 1 || frame > to + seconds(0.3)) return null;
  const grow = spring({ frame: frame - from, fps, config: { damping: 12, stiffness: 210, mass: 0.7 } });
  const leave = Easing.in(Easing.back(1.6))(interpolate(frame, [to, to + seconds(0.25)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const scale = grow * (1 - leave);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 82, display: "flex", justifyContent: "center" }}>
      <TextCard size={84} style={{ transform: `scale(${Math.max(0, scale)}) rotate(${(1 - grow) * -6}deg)`, boxShadow: `0 8px 0 #1d1955` }}>
        {children}
      </TextCard>
    </div>
  );
}
