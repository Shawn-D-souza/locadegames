// Renders the app's moving screens as clips, one per friend's phone, at a real phone's size (3x): the room filling
// up, Territory, Act 3's games on Ana's phone. Frames go in order in one tab (concurrency 1), so the app's own
// animations and the Territory renderer play on the video's clock. Run from video/: npm run clips [clip | clip-friend ...] [--draft]. Output:
// public/screens/<clip>-<friend>.mp4. --draft renders them at 1x, much faster, for previews (npm run preview); the
// final render needs them at full size again (without --draft).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../webpack-override.mjs";

const here = process.cwd();
// Each clip's composition and whose phones it's on (Act 3's games play on Ana's alone).
const CLIPS = { room: ["RoomScreen", 4], territory: ["TerritoryScreen", 4], pool: ["PoolClip", 1], carrom: ["CarromClip", 1], dotsClash: ["DotsClashClip", 1], headCrash: ["HeadCrashClip", 1], chess: ["ChessClip", 1], memory: ["MemoryClip", 1], ludo: ["LudoClip", 1], snakesLadders: ["SnakesLaddersClip", 1], fourInARow: ["FourInARowClip", 1], seaBattle: ["SeaBattleClip", 1], checkers: ["CheckersClip", 1], dotsBoxes: ["DotsBoxesClip", 1], ultimate: ["UltimateClip", 1] };
// A clip's name renders all four phones; "room-0" just Ana's.
const args = process.argv.slice(2);
const draft = args.includes("--draft");
const named = args.filter((a) => a !== "--draft");
const wanted = named.length ? named : Object.keys(CLIPS);
mkdirSync(path.join(here, "public/screens"), { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir: path.join(here, "public"), webpackOverride, enableCaching: true, onProgress: () => {} });

const jobs = wanted.flatMap((name) => {
  const [clip, one] = name.split("-");
  return (one === undefined ? [0, 1, 2, 3].slice(0, CLIPS[clip][1]) : [Number(one)]).map((me) => ({ clip, me }));
});
// A few clips at a time, each in its own tab; inside a clip, frames stay in order.
await Promise.all(
  [0, 1, 2, 3].map(async (lane) => {
    for (let j = lane; j < jobs.length; j += 4) {
      const { clip, me } = jobs[j];
      const inputProps = { me };
      // 3x like a real phone: Remotion's video reader fails on taller clips (4x, 3376 px, already does).
      const scale = draft ? 1 : 3;
      const composition = await selectComposition({ serveUrl, id: CLIPS[clip][0], inputProps });
      const output = path.join(here, `public/screens/${clip}-${me}.mp4`);
      await renderMedia({ composition, serveUrl, codec: "h264", crf: draft ? 20 : 10, scale, concurrency: 1, inputProps, outputLocation: output, muted: true });
      console.log("  ", path.relative(here, output));
    }
  }),
);
