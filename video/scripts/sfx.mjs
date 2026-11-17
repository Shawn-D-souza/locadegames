// Brings the app's own sounds (rendered losslessly by the app's `npm run sounds`) into public/sfx/ for the video,
// each brought up to the same peak: the app makes them for a phone speaker with nothing else playing, so they would be
// lost under the music. How loud each one plays in the video is set where it's placed (src/video/Sounds.tsx).
// Run from video/: npm run sfx. Uses the system's ffmpeg.
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const PEAK_DB = -3;
const root = path.resolve(process.cwd(), "..");
const from = path.join(root, "dist/sounds");
if (!existsSync(from)) execSync("npm run sounds", { cwd: root, stdio: "inherit" });
const to = path.join(process.cwd(), "public/sfx");
mkdirSync(to, { recursive: true });

const files = readdirSync(from).filter((f) => f.endsWith(".wav"));
for (const f of files) {
  const src = path.join(from, f);
  // ffmpeg reports on stderr; spawnSync keeps it
  const out = spawnSync("ffmpeg", ["-hide_banner", "-i", src, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? 0);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", `volume=${(PEAK_DB - peak).toFixed(2)}dB`, "-c:a", "pcm_s16le", path.join(to, f)]);
}
console.log(`${files.length} sounds in public/sfx/, each peaking at ${PEAK_DB} dB`);
