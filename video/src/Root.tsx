import { Composition, Still } from "remotion";
import { FontsReady } from "./parts/FontsReady";
import { PHONE_SCREEN } from "./parts/Phone";
import { FRAME } from "./look";
import { RoomPhoneScreen } from "./screens/RoomPhoneScreen";
import { PoolTabletScreen } from "./screens/PoolTabletScreen";
import { TerritoryPhoneScreen } from "./screens/TerritoryPhoneScreen";
import { clipLength, SIDEWAYS } from "./screens/clips";
import { PoolClip } from "./screens/games/PoolClip";
import { CarromClip } from "./screens/games/CarromClip";
import { DotsClashClip } from "./screens/games/DotsClashClip";
import { HeadCrashClip } from "./screens/games/HeadCrashClip";
import { ChessClip } from "./screens/games/ChessClip";
import { MemoryClip } from "./screens/games/MemoryClip";
import { LudoClip } from "./screens/games/LudoClip";
import { SnakesLaddersClip } from "./screens/games/SnakesLaddersClip";
import { FourInARowClip } from "./screens/games/FourInARowClip";
import { SeaBattleClip } from "./screens/games/SeaBattleClip";
import { CheckersClip } from "./screens/games/CheckersClip";
import { DotsBoxesClip } from "./screens/games/DotsBoxesClip";
import { UltimateClip } from "./screens/games/UltimateClip";
import { ChatFrame } from "./frames/ChatFrame";
import { PhonesFrame } from "./frames/PhonesFrame";
import { PoolFrame, PoolPhoneFrame } from "./frames/PoolFrame";
import { TextFrame } from "./frames/TextFrame";
import { EndFrame } from "./frames/EndFrame";
import { DotsTest } from "./frames/DotsTest";
import { LaunchVideo } from "./video/LaunchVideo";
import { MUSIC_SECONDS } from "./timing";

/** A screen held sideways, in CSS pixels; rendered at 1.5x it fills the 1080p frame. */
export const SIDEWAYS_SCREEN = { width: 1280, height: 720 } as const;

export function Root() {
  return (
    <FontsReady>
      <Composition id="LaunchVideo" component={LaunchVideo} width={FRAME.width} height={FRAME.height} fps={FRAME.fps} durationInFrames={Math.round(MUSIC_SECONDS * FRAME.fps)} />
      {/* The app's screens, each at a real screen's size (rendered first, then placed in the frames) */}
      <Composition id="RoomScreen" component={RoomPhoneScreen} {...PHONE_SCREEN} fps={FRAME.fps} durationInFrames={clipLength("room")} defaultProps={{ me: 0, still: false }} />
      <Composition id="TerritoryScreen" component={TerritoryPhoneScreen} {...PHONE_SCREEN} fps={FRAME.fps} durationInFrames={clipLength("territory")} defaultProps={{ me: 0 }} />
      <Composition id="PoolClip" component={PoolClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("pool")} />
      <Composition id="CarromClip" component={CarromClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("carrom")} />
      <Composition id="DotsClashClip" component={DotsClashClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("dotsClash")} />
      <Composition id="HeadCrashClip" component={HeadCrashClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("headCrash")} />
      <Composition id="ChessClip" component={ChessClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("chess")} />
      <Composition id="MemoryClip" component={MemoryClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("memory")} />
      <Composition id="LudoClip" component={LudoClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("ludo")} />
      <Composition id="SnakesLaddersClip" component={SnakesLaddersClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("snakesLadders")} />
      <Composition id="FourInARowClip" component={FourInARowClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("fourInARow")} />
      <Composition id="SeaBattleClip" component={SeaBattleClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("seaBattle")} />
      <Composition id="CheckersClip" component={CheckersClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("checkers")} />
      <Composition id="DotsBoxesClip" component={DotsBoxesClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("dotsBoxes")} />
      <Composition id="UltimateClip" component={UltimateClip} {...SIDEWAYS} fps={FRAME.fps} durationInFrames={clipLength("ultimate")} />
      <Composition id="PoolScreen" component={PoolTabletScreen} {...SIDEWAYS_SCREEN} fps={FRAME.fps} durationInFrames={1} />
      <Composition id="PoolPhoneScreen" component={PoolTabletScreen} width={PHONE_SCREEN.height} height={PHONE_SCREEN.width} fps={FRAME.fps} durationInFrames={1} />
      {/* Style frames */}
      <Still id="Frame1Chat" component={ChatFrame} width={FRAME.width} height={FRAME.height} defaultProps={{ dots: "soft" as const }} />
      <Still id="Frame2Phones" component={PhonesFrame} width={FRAME.width} height={FRAME.height} />
      <Still id="Frame3Pool" component={PoolFrame} width={FRAME.width} height={FRAME.height} />
      <Still id="Frame3PoolPhone" component={PoolPhoneFrame} width={FRAME.width} height={FRAME.height} />
      <Still id="Frame4Text" component={TextFrame} width={FRAME.width} height={FRAME.height} />
      <Still id="Frame5End" component={EndFrame} width={FRAME.width} height={FRAME.height} />
      <Composition id="DotsTest" component={DotsTest} width={FRAME.width} height={FRAME.height} fps={FRAME.fps} durationInFrames={FRAME.fps * 3} defaultProps={{ dots: "soft" as const }} />
    </FontsReady>
  );
}
