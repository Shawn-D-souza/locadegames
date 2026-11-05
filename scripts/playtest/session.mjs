// What every game's playtest shares: players in a room, steps that pass or fail, and photos when one fails.
import { mkdir } from "node:fs/promises";

const FAILURES = new URL("../../screenshots/playtest-failures/", import.meta.url).pathname;
/** How long a step may wait for what it expects to show. */
export const STEP_TIMEOUT_MS = 10_000;

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Session {
  constructor(browser, base, game) {
    this.browser = browser;
    this.base = base;
    this.game = game;
    /** name → page, for photos when a step fails. */
    this.players = new Map();
    this.errors = [];
    this.failed = false;
    /** Later steps still run after a failure: for flows whose steps don't depend on each other. */
  }

  /** A new phone-sized player. */
  async player(name) {
    const page = await (await this.browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    page.on("pageerror", (e) => this.errors.push(`${name}: ${e}`));
    this.players.set(name, page);
    return page;
  }

  /** The host creates a room and everyone else joins it with the link. Returns [host, ...guests]. */
  async room(count) {
    const host = await this.player("host");
    await host.goto(this.base);
    await host.getByRole("button", { name: /create room/i }).click();
    await host.waitForURL(/room=\d{6}/);
    const code = new URL(host.url()).searchParams.get("room");
    const pages = [host];
    for (let i = 1; i < count; i++) {
      const guest = await this.player(`guest${i}`);
      await guest.goto(`${this.base}?room=${code}`);
      await guest.getByRole("button", { name: /join room/i }).click();
      pages.push(guest);
    }
    // Everyone is in once the host sees them all.
    await host.getByText(/players/i).first().waitFor();
    await wait(800);
    return pages;
  }

  /** One step: passes, or fails with photos of every player (later steps are skipped). */
  async step(name, run) {
    if (this.failed) return console.log(`  - ${name} (skipped)`);
    const started = Date.now();
    try {
      await run();
      console.log(`  ✓ ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    } catch (e) {
      this.failed = true;
      console.log(`  ✗ ${name}\n      ${String(e.message ?? e).split("\n")[0]}`);
      await mkdir(FAILURES, { recursive: true });
      for (const [who, page] of this.players) {
        await page.screenshot({ path: `${FAILURES}${this.game}-${who}.png` }).catch(() => undefined);
      }
      console.log(`      photos: screenshots/playtest-failures/${this.game}-*.png`);
    }
  }
}

/** Waits until `page` shows text matching `pattern` (case-insensitive: some labels are drawn in capitals). */
export async function sees(page, pattern, timeout = STEP_TIMEOUT_MS) {
  await page.getByText(pattern).first().waitFor({ timeout });
}

/** Fails unless `page` has played these sounds, in this order (others may come between). The app logs them in development. */
export async function heard(page, ...sounds) {
  const log = await page.evaluate(() => window.soundLog ?? []);
  let from = 0;
  for (const sound of sounds) {
    const at = log.indexOf(sound, from);
    if (at === -1) throw new Error(`didn't hear ${sound}${from ? " in order" : ""}; heard: ${log.join(", ")}`);
    from = at + 1;
  }
}
