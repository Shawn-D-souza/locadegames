import { Audio, Sequence, staticFile } from "remotion";
import { cue, seconds, type CueName } from "../timing";

/** The app's own sounds, on the moments they belong to (each friend's message on that friend's note). */
// Every file peaks at -3 dB (scripts/sfx.mjs); these volumes set the balance against the music (which peaks near -9 dB).
const SOUNDS: { at: CueName | number; file: string; volume: number }[] = [
  { at: "bubble1", file: "playerJoined-1", volume: 0.7 },
  { at: "bubble2", file: "playerJoined-2", volume: 0.7 },
  { at: "bubble3", file: "playerJoined-3", volume: 0.7 },
  { at: "bubble4", file: "playerJoined-0", volume: 0.7 },
  { at: "bubble5", file: "playerJoined-0", volume: 0.6 },
  { at: "inviteCard", file: "roomCodeComplete", volume: 0.8 },
  // Act 2: each phone arrives on its friend's note, Ana's tap, the app's 3, 2, 1, GO, the first captures.
  { at: "phone1", file: "playerJoined-0", volume: 0.6 },
  { at: "phone2", file: "playerJoined-1", volume: 0.7 },
  { at: "phone3", file: "playerJoined-2", volume: 0.7 },
  { at: "phone4", file: "playerJoined-3", volume: 0.7 },
  { at: "tapTerritory", file: "cardPress-0", volume: 0.8 },
  { at: "count3", file: "countdownTick-0", volume: 0.75 },
  { at: "count2", file: "countdownTick-1", volume: 0.75 },
  { at: "count1", file: "countdownTick-2", volume: 0.75 },
  { at: "go", file: "countdownGo", volume: 0.8 },
  { at: 17.0, file: "territoryCaptureMedium-0", volume: 0.5 },
  { at: 17.5, file: "territoryCaptureMedium-1", volume: 0.6 },
  { at: 18.0, file: "territoryCaptureMedium-2", volume: 0.5 },
  // Act 3. Pool: the cue strikes in the silence, the rack bursts on the drop, three of Ana's balls go in.
  { at: 19.814, file: "poolStrike-2", volume: 0.8 },
  { at: "poolBreak", file: "poolClack-3", volume: 0.8 },
  { at: 20.02, file: "poolClack-1", volume: 0.5 },
  { at: 20.164, file: "poolPocket", volume: 0.6 },
  { at: 20.342, file: "poolPocket", volume: 0.6 },
  { at: 21.081, file: "poolPocket", volume: 0.6 },
  // Carrom: Ana's flick, three coins in (the queen and her cover).
  { at: "carrom", file: "carromFlick-2", volume: 0.8 },
  { at: 22.65, file: "carromPocket", volume: 0.6 },
  { at: 22.97, file: "carromPocket", volume: 0.6 },
  { at: 23.25, file: "carromPocket", volume: 0.6 },
  // Dots Clash: a burst on every chain note, climbing.
  { at: "chainWave1", file: "dotsClashBurst-0", volume: 0.5 },
  { at: "chainWave2", file: "dotsClashBurst-1", volume: 0.5 },
  { at: "chainWave3", file: "dotsClashBurst-2", volume: 0.5 },
  { at: "chainWave4", file: "dotsClashBurst-3", volume: 0.5 },
  { at: "chainWave5", file: "dotsClashBurst-4", volume: 0.5 },
  { at: "chainWave6", file: "dotsClashBurst-5", volume: 0.5 },
  { at: "chainWave7", file: "dotsClashBurst-6", volume: 0.5 },
  { at: "chainWave8", file: "dotsClashBurst-7", volume: 0.5 },
  // Head Crash: Ana lands on Ben's head.
  { at: 29.25, file: "headCrashYouScored", volume: 0.8 },
  // Chess: the queen takes f7, the board thumps, the win (the app's own ending, timed as in the app).
  { at: 30.5, file: "chessCapture", volume: 0.8 },
  { at: 30.825, file: "boardThump", volume: 0.7 },
  { at: 31.45, file: "matchWinFanfare", volume: 0.7 },
  // The flashes, each its game's own sound on its moment (timed as the clips play them).
  { at: "flash_memory", file: "memoryFlip-1", volume: 0.6 },
  { at: 32.17, file: "memoryYourPair-0", volume: 0.75 },
  { at: 32.6, file: "ludoCapture", volume: 0.8 },
  { at: "flash_snakesLadders", file: "snakesLaddersLadder", volume: 0.75 },
  { at: "flash_fourInARow", file: "winLineDrawn", volume: 0.75 },
  { at: 34.1, file: "seaBattleYouHit", volume: 0.8 },
  { at: 34.63, file: "checkersCapture-0", volume: 0.75 },
  { at: 34.81, file: "checkersCapture-1", volume: 0.75 },
  { at: "flash_dotsBoxes", file: "dotsBoxesLine-0", volume: 0.6 },
  { at: 35.2, file: "dotsBoxesYourBox-1", volume: 0.75 },
  { at: 35.8, file: "ultimateYouClaimedBoard", volume: 0.8 },
  // Act 4: the chat again, each message on its sender's note (Zoe's is the fifth player's).
  { at: "backToPhones", file: "playerJoined-4", volume: 0.7 },
  { at: 39, file: "playerJoined-4", volume: 0.6 },
  { at: "territoryWin", file: "playerJoined-1", volume: 0.7 },
  { at: 41, file: "playerJoined-0", volume: 0.6 },
  { at: "championCard", file: "playerJoined-4", volume: 0.75 },
];

export function Sounds() {
  return (
    <>
      {SOUNDS.map((s, i) => (
        <Sequence key={i} from={typeof s.at === "number" ? seconds(s.at) : cue(s.at)} layout="none">
          <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
    </>
  );
}
