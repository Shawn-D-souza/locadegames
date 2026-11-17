import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Page } from "../parts/Page";
import { Phone } from "../parts/Phone";
import { blendCamera, cameraTransform, CENTER, REST, type Camera } from "../parts/camera";
import { CLIPS, clipFile, SIDEWAYS, type ClipName } from "../screens/clips";
import { cue, seconds } from "../timing";
import { Act3Grid } from "./Act3Grid";

/**
 * Act 3 (0:20–0:38): the games, on Ana's phone held sideways in the middle of the frame (where Act 2's dive left it).
 * Through each game the camera pushes in toward where its moment happens; on each cut to the next game the phone
 * kicks, as if turned in the hand. Then eight flashes, a beat each, already close on their moment as they cut in; the
 * last one starts on Ultimate's middle small board alone (tic-tac-toe, as far as anyone can tell) and pulls out to the
 * whole board. Then the room's games grid (`Act3Grid`). Frames here count from the start of the act (the drop).
 */

const START = cue("poolBreak");
/** Ana's phone sideways: its screen this wide, as the dive left it. */
const SIDEWAYS_W = 1640;
const K = SIDEWAYS_W / SIDEWAYS.width;

/** A point on the phone's screen (CSS px) in the frame, with the camera at rest. */
const onFrame = (x: number, y: number) => ({ x: CENTER.x + (x - SIDEWAYS.width / 2) * K, y: CENTER.y + (y - SIDEWAYS.height / 2) * K });

/**
 * Each game's stretch of the act (video frames): its clip plays in the phone from `from` to `to`, while the camera
 * pushes to `zoom` toward `toward` (a point on the screen, CSS px) by `pushBy` (default: the end). A flash cuts in
 * already `start` of the way there (0 … 1); `pull` turns it round: from close in, out to the whole phone.
 */
interface Game {
  clip: ClipName;
  from: number;
  to: number;
  toward: { x: number; y: number };
  zoom: number;
  pushBy?: number;
  start?: number;
  pull?: boolean;
}

/** A flash: a beat, already close in as it cuts, pushing a little closer. */
const flash = (clip: ClipName, at: string, next: string, toward: { x: number; y: number }, zoom: number): Game => ({ clip, from: cue(at), to: cue(next), toward, zoom, start: 0.8 });

const GAMES: Game[] = [
  // The table, the rack's side a little.
  { clip: "pool", from: START, to: cue("carrom"), toward: { x: 330, y: 195 }, zoom: 1.12 },
  // The board's bottom right, where the queen goes in.
  { clip: "carrom", from: cue("carrom"), to: cue("dotsClash"), toward: { x: 360, y: 220 }, zoom: 1.22 },
  // The board, on the right of the screen: close, the chain filling it.
  { clip: "dotsClash", from: cue("dotsClash"), to: cue("headCrash"), toward: { x: 645, y: 195 }, zoom: 1.5, pushBy: cue("chainWave2") },
  // Toward the right, where Ana lands on Ben's head.
  { clip: "headCrash", from: cue("headCrash"), to: cue("chess"), toward: { x: 600, y: 215 }, zoom: 1.3, pushBy: cue("headCrash") + seconds(1.25) },
  // The board and the cards.
  { clip: "chess", from: cue("chess"), to: cue("flash_memory"), toward: { x: 470, y: 195 }, zoom: 1.12 },
  // The flashes: each on its board, its moment in the middle.
  flash("memory", "flash_memory", "flash_ludo", { x: 555, y: 195 }, 1.2),
  flash("ludo", "flash_ludo", "flash_snakesLadders", { x: 300, y: 150 }, 1.75),
  flash("snakesLadders", "flash_snakesLadders", "flash_fourInARow", { x: 285, y: 195 }, 1.6),
  flash("fourInARow", "flash_fourInARow", "flash_seaBattle", { x: 515, y: 215 }, 1.3),
  flash("seaBattle", "flash_seaBattle", "flash_checkers", { x: 470, y: 215 }, 1.4),
  flash("checkers", "flash_checkers", "flash_dotsBoxes", { x: 545, y: 195 }, 1.3),
  flash("dotsBoxes", "flash_dotsBoxes", "flash_ticTacToeToUltimate", { x: 655, y: 195 }, 1.55),
  // The middle small board alone, filling the frame, then the whole board.
  { clip: "ultimate", from: cue("flash_ticTacToeToUltimate"), to: cue("gamesGrid"), toward: { x: 514, y: 195 }, zoom: 4.2, pull: true },
];

/** The camera through a game: from the whole phone, pushing in toward its moment. */
function cameraIn(game: Game, frame: number): Camera {
  const end = game.pushBy ?? game.to;
  const target: Camera = { scale: game.zoom, focus: onFrame(game.toward.x, game.toward.y) };
  if (game.pull) {
    // Held on the small board while its line slashes through, then out: fast, then settling.
    const out = Easing.inOut(Easing.cubic)(interpolate(frame, [game.from + seconds(0.12), game.to - seconds(0.02)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return blendCamera(target, REST, out);
  }
  const q = interpolate(frame, [game.from, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p = game.start === undefined ? Easing.inOut(Easing.cubic)(q) : game.start + (1 - game.start) * Easing.out(Easing.quad)(q);
  // A push that ends early keeps drifting in, slowly, to the cut.
  const drift = game.pushBy === undefined ? 1 : 1 + 0.04 * interpolate(frame, [end, game.to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cam = blendCamera(REST, target, p);
  return { ...cam, scale: cam.scale * drift };
}

/** The phone's kick on a cut: a quick turn and squeeze that springs back, the other way each time. */
function kick(frame: number, index: number) {
  if (index === 0) return { rotate: 0, scale: 1 };
  const q = interpolate(frame, [GAMES[index]!.from, GAMES[index]!.from + seconds(0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const left = Math.exp(-5 * q) * Math.cos(q * Math.PI * 2.2);
  return { rotate: (index % 2 ? 2.4 : -2.4) * left, scale: 1 - 0.035 * left };
}

export function Act3Games() {
  const frame = useCurrentFrame() + START;
  if (frame >= cue("gamesGrid")) {
    return (
      <Page>
        <Sequence from={cue("gamesGrid") - START}>
          <Act3Grid />
        </Sequence>
      </Page>
    );
  }
  const index = Math.max(0, GAMES.findIndex((g) => frame >= g.from && frame < g.to));
  const game = GAMES[index]!;
  const cam = cameraIn(game, frame);
  const { rotate, scale } = kick(frame, index);
  return (
    <Page>
      <AbsoluteFill style={{ transform: cameraTransform(cam), transformOrigin: "0 0" }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Phone
            width={SIDEWAYS_W}
            sideways
            style={{ transform: `rotate(${rotate}deg) scale(${scale})` }}
            screen={GAMES.map((g) => (
              <Sequence key={g.clip} from={g.from - START} durationInFrames={g.to - g.from} layout="none">
                <OffthreadVideo src={staticFile(clipFile(g.clip, 0))} trimBefore={g.from - CLIPS[g.clip].from} muted style={{ width: "100%", height: "100%", display: "block" }} />
              </Sequence>
            ))}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </Page>
  );
}
