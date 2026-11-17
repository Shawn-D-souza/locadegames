// Renders the style frames: first the app's screens (at a real screen's size, sharp), then the frames that use them.
// Run from video/: npm run stills. Screens go to public/screens/, frames to out/frames/.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../webpack-override.mjs";

const here = path.resolve(import.meta.dirname, "..");
mkdirSync(path.join(here, "public/screens"), { recursive: true });
mkdirSync(path.join(here, "out/frames"), { recursive: true });

// The bundle takes a copy of public/, so the frames get a second bundle made after the screens are written.
const make = () => bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir: path.join(here, "public"), webpackOverride, enableCaching: true, onProgress: () => {} });
let serveUrl = await make();

async function still(id, output, { props = {}, scale = 1 } = {}) {
  const composition = await selectComposition({ serveUrl, id, inputProps: props });
  await renderStill({ composition, serveUrl, output: path.join(here, output), inputProps: props, scale, imageFormat: "png" });
  console.log("  ", output);
}

for (let me = 0; me < 4; me++) await still("RoomScreen", `public/screens/room-${me}.png`, { props: { me, still: true }, scale: 3 });
await still("PoolScreen", "public/screens/pool.png", { scale: 1.5 });
await still("PoolPhoneScreen", "public/screens/pool-phone.png", { scale: 3 });
serveUrl = await make();
for (const id of ["Frame1Chat", "Frame2Phones", "Frame3Pool", "Frame3PoolPhone", "Frame4Text", "Frame5End"]) await still(id, `out/frames/${id}.png`);
