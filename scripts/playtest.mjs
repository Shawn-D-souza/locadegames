// Plays each game end to end in real browsers against the local game server, checking the big moments
// (start, a move or a capture, a knockout, the ending, the results). Fails loudly, with photos.
// Needs the game server: `npm run dev:server`.
// Usage: npm run playtest                   every game (before a push), a few at a time
//        npm run playtest territory         one game (while working on it)
//        npm run playtest -- --jobs 1       one game at a time (if a busy machine makes the timing checks flaky)
// Games play side by side, each in its own room (as real rooms do on one server), so a full run takes about as long
// as its slowest game, not the sum of them all, however many games there are.
import { availableParallelism } from "node:os";
import { chromium } from "playwright";
import { createServer } from "vite";
import dotsclash from "./playtest/dotsclash.mjs";
import snakesladders from "./playtest/snakesladders.mjs";
import headcrash from "./playtest/headcrash.mjs";
import ludo from "./playtest/ludo.mjs";
import pool from "./playtest/pool.mjs";
import seabattle from "./playtest/seabattle.mjs";
import { Session } from "./playtest/session.mjs";
import territory from "./playtest/territory.mjs";
import tictactoe from "./playtest/tictactoe.mjs";
import ultimate from "./playtest/ultimate.mjs";

/** One flow per game; a new game adds its file here. The longest come first, so they start at once. */
const GAMES = { headcrash, seabattle, territory, ludo, pool, snakesladders, dotsclash, ultimate, tictactoe };
const SERVER = "http://localhost:8787";
const PORT = 5198;
/**
 * How many games play at once. Each runs 2–3 phones (browser pages), and the real-time games' timing checks
 * need some CPU to spare, so it stays well under the machine's cores.
 */
const DEFAULT_JOBS = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2) + 1));

const args = process.argv.slice(2);
const jobsAt = args.indexOf("--jobs");
const jobs = jobsAt === -1 ? DEFAULT_JOBS : Number(args[jobsAt + 1]);
const asked = args.filter((arg, i) => !arg.startsWith("--") && (jobsAt === -1 || i !== jobsAt + 1));
if (!Number.isInteger(jobs) || jobs < 1) {
  console.error("--jobs takes a whole number, 1 or more");
  process.exit(1);
}
const unknown = asked.filter((name) => !(name in GAMES));
if (unknown.length) {
  console.error(`Unknown game: ${unknown.join(", ")}. Games: ${Object.keys(GAMES).join(", ")}`);
  process.exit(1);
}
try {
  await fetch(SERVER);
} catch {
  console.error(`The game server isn't running at ${SERVER}. Start it first: npm run dev:server`);
  process.exit(1);
}

const vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await vite.listen();
// Make the sounds before the first page asks for them (they take longer than a page load may wait).
await vite.transformRequest("virtual:sound-files");
const browser = await chromium.launch();
const queue = asked.length ? [...asked] : Object.keys(GAMES);
const results = [];
const runStarted = Date.now();

/** Plays one game and prints its lines together once it's done. */
async function play(name) {
  const started = Date.now();
  const session = new Session(browser, `http://localhost:${PORT}/`, name);
  try {
    await GAMES[name](session);
  } catch (e) {
    session.failed = true;
    session.log(`  ✗ the flow itself broke: ${String(e.message ?? e).split("\n")[0]}`);
  }
  for (const error of session.errors) session.log(`  page error: ${error}`);
  const failed = session.failed || session.errors.length > 0;
  const seconds = (Date.now() - started) / 1000;
  console.log(`${name}\n${session.lines.join("\n")}\n  ${failed ? "FAILED" : "passed"} in ${seconds.toFixed(0)} s\n`);
  results.push({ name, failed, seconds });
  for (const page of session.players.values()) await page.context().close().catch(() => undefined);
}

try {
  if (queue.length > 1) console.log(`Playing ${queue.length} games, ${Math.min(jobs, queue.length)} at a time\n`);
  await Promise.all(
    Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      while (queue.length) await play(queue.shift());
    }),
  );
} finally {
  await browser.close();
  await vite.close();
}
const failed = results.filter((r) => r.failed).map((r) => r.name);
if (results.length > 1) {
  const total = ((Date.now() - runStarted) / 1000).toFixed(0);
  console.log(failed.length ? `FAILED: ${failed.join(", ")} (${total} s)` : `All ${results.length} games passed in ${total} s`);
}
process.exit(failed.length ? 1 : 0);
