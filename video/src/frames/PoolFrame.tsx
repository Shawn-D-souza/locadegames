import { AbsoluteFill, Img, staticFile } from "remotion";
import { Page } from "../parts/Page";
import { Phone } from "../parts/Phone";

/** Style frame 3, option A: a game filling the frame (the camera is inside the screen): Pool, the moment before the break. */
export function PoolFrame() {
  return (
    <AbsoluteFill>
      <Img src={staticFile("screens/pool.png")} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
}

/** Style frame 3, option B: the same moment on Ana's phone, held sideways, filling most of the frame. */
export function PoolPhoneFrame() {
  return (
    <Page>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Phone src={staticFile("screens/pool-phone.png")} width={1640} sideways />
      </div>
    </Page>
  );
}
