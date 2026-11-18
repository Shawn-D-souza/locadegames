// Photographs every game's tile art (the dev page `?preview=tiles`) into src/web/public/art/<slug>.png for the pages
// made for search, which are plain HTML and can't draw the canvas parts of some tiles. Run it again after changing a
// tile's art or adding a game. Usage: npm run search-art
import { mkdir, rm } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const OUT = new URL("../src/web/public/art/", import.meta.url).pathname;
const PORT = 5196;
/** Pictures are taken at twice their size on screen, so they stay sharp on phones. */
const SCALE = 2;
/** Long enough for tiles drawn on a canvas (loaded on demand) to finish. */
const SETTLE_MS = 800;

const vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "silent" });
await vite.listen();
const { GAME_COPY } = await vite.ssrLoadModule("/search/content/gameCopy.ts");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: SCALE });
  await page.goto(`http://localhost:${PORT}/?preview=tiles`, { waitUntil: "networkidle" });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const [id, copy] of Object.entries(GAME_COPY)) {
    await page.locator(`[data-tile="${id}"]`).screenshot({ path: `${OUT}${copy.slug}.png` });
    console.log("  ", `art/${copy.slug}.png`);
  }
} finally {
  await browser.close();
  await vite.close();
}
