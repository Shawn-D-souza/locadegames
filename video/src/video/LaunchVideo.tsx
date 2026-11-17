import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Page } from "../parts/Page";
import { Act1Chat } from "./Act1Chat";
import { Act2Phones } from "./Act2Phones";
import { Act3Games } from "./Act3Games";
import { Act4Chat } from "./Act4Chat";
import { Act4Logo } from "./Act4Logo";
import { Sounds } from "./Sounds";
import { cue, seconds } from "../timing";

/**
 * The whole video: the music, the app's sounds on their moments, and the acts in order on the dotted page (Act 4's
 * chat comes in over the end of Act 3, so it draws no page of its own).
 */
export function LaunchVideo() {
  return (
    <AbsoluteFill>
      <Page />
      <Audio src={staticFile("music.wav")} />
      <Sounds />
      <Sequence durationInFrames={cue("roomOpens") + 6}>
        <Act1Chat />
      </Sequence>
      <Sequence from={cue("roomOpens")} durationInFrames={cue("poolBreak") - cue("roomOpens")}>
        <Act2Phones />
      </Sequence>
      <Sequence from={cue("poolBreak")} durationInFrames={cue("backToPhones") - cue("poolBreak")}>
        <Act3Games />
      </Sequence>
      <Sequence from={cue("backToPhones") - seconds(0.4)} durationInFrames={cue("logoX") + seconds(0.6) - (cue("backToPhones") - seconds(0.4))}>
        <Act4Chat />
      </Sequence>
      <Sequence from={cue("logoX")}>
        <Act4Logo />
      </Sequence>
    </AbsoluteFill>
  );
}
