// Plays each game end to end in real browsers against the local game server, checking the big moments
// (start, a move or a capture, a knockout, the ending, the results). Fails loudly, with photos.
// Needs the game server: `npm run dev:server`.
// Usage: npm run playtest              every game (before a push)
//        npm run playtest territory    one game (while working on it)
import { chromium } from "playwright";
import { createServer } from "vite";
import { Session } from "./playtest/session.mjs";
import territory from "./playtest/territory.mjs";
import tictactoe from "./playtest/tictactoe.mjs";

/** One flow per game; a new game adds its file here. */
const GAMES = { tictactoe, territory };
const SERVER = "http://localhost:8787";
const PORT = 5198;

const asked = process.argv.slice(2);
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
let failed = false;
try {
  for (const name of asked.length ? asked : Object.keys(GAMES)) {
    const started = Date.now();
    console.log(name);
    const session = new Session(browser, `http://localhost:${PORT}/`, name);
    await GAMES[name](session);
    for (const error of session.errors) console.log(`  page error: ${error}`);
    failed ||= session.failed || session.errors.length > 0;
    console.log(`  ${session.failed ? "FAILED" : "passed"} in ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
    for (const page of session.players.values()) await page.context().close();
  }
} finally {
  await browser.close();
  await vite.close();
}
process.exit(failed ? 1 : 0);
