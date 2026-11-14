// What every part of the screenshots shares: phones, a room to play in, and taking a photo at every screen size.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { wait } from "../playtest/session.mjs";

export const OUT = new URL("../../screenshots/", import.meta.url).pathname;

/**
 * [folder, width, height]: the fewest sizes that still show every layout: a small phone (the cramped one), a usual
 * phone, the same phone held sideways (`sideways:`), a tablet and a desktop. Phones between these look like one of them.
 */
export const SIZES = [
  ["1-small-phone", 320, 568],
  ["2-phone", 390, 844],
  ["3-sideways", 844, 390],
  ["4-tablet", 768, 1024],
  ["5-desktop", 1280, 800],
];
const PHONE = { width: 390, height: 844 };
/** Long enough for layouts that measure themselves (`useElementSize`) to settle after a resize. */
const SETTLE_MS = 150;

export class Camera {
  /** `part`: the folder its photos go in (`platform` or a game's id). */
  constructor(browser, base, part) {
    this.browser = browser;
    this.base = base;
    this.part = part;
    this.dir = `${OUT}${part}/`;
    /** [{ file, title, screen }] in the order taken; the index page lists them so. */
    this.shots = [];
    this.pages = [];
    this.errors = [];
  }

  /** Empties this part's folder, so only its latest photos are kept. */
  async clear() {
    await rm(this.dir, { recursive: true, force: true });
    for (const [folder] of SIZES) await mkdir(this.dir + folder, { recursive: true });
  }

  /** A new phone-sized player. */
  async player() {
    const page = await (await this.browser.newContext({ viewport: PHONE })).newPage();
    page.on("pageerror", (e) => this.errors.push(String(e)));
    this.pages.push(page);
    return page;
  }

  /** The host creates a room and everyone else joins it with the link. Returns [host, ...guests]. */
  async room(count) {
    const host = await this.player();
    await host.goto(this.base);
    await host.getByRole("button", { name: /create room/i }).click();
    await host.waitForURL(/room=\d{6}/);
    const pages = [host];
    for (let i = 1; i < count; i++) pages.push(await this.join(roomCode(host)));
    await host.getByRole("button", { name: /territory/i }).waitFor();
    await wait(800);
    return pages;
  }

  /** A new player joining room `code` with the link. */
  async join(code) {
    const guest = await this.player();
    await guest.goto(`${this.base}?room=${code}`);
    await guest.getByRole("button", { name: /join room/i }).click();
    await guest.getByRole("button", { name: /territory/i }).waitFor();
    return guest;
  }

  /**
   * Photographs `page` at every size as `NN-name.png` (numbered in the order taken). The whole page by default;
   * `{ screen: true }` for what covers only the visible screen (popups, toasts), which a full-page photo would misplace.
   */
  async shoot(page, name, { screen = false } = {}) {
    const file = `${String(this.shots.length + 1).padStart(2, "0")}-${name}`;
    this.shots.push({ file, title: name.replaceAll("-", " "), screen });
    for (const [folder, width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await wait(SETTLE_MS);
      await page.screenshot({ path: `${this.dir}${folder}/${file}.png`, fullPage: !screen });
    }
    await page.setViewportSize(PHONE);
  }

  /** When a part stops early: a photo of every phone as it was, `failed-N.png` in its folder. Returns how many. */
  async photographFailure() {
    for (const [i, page] of this.pages.entries()) await page.screenshot({ path: `${this.dir}failed-${i + 1}.png` }).catch(() => undefined);
    return this.pages.length;
  }

  /** Writes the list of photos for the index page and closes every phone. */
  async finish(failure) {
    await writeFile(`${this.dir}shots.json`, JSON.stringify({ part: this.part, taken: new Date().toISOString(), failure, shots: this.shots }, null, 2));
    for (const page of this.pages) await page.context().close().catch(() => undefined);
  }
}

export const roomCode = (page) => new URL(page.url()).searchParams.get("room");

/** The turn-based games' board (tic-tac-toe, Ultimate, Dots Clash). */
export const board = (page) => page.getByRole("group", { name: "Board" });

/** Waits for whichever of `pages` can do something first; returns that page. */
export function whoever(pages, ready, timeout = 8_000) {
  return Promise.any(pages.map(async (page) => (await ready(page).waitFor({ timeout }), page)));
}

/** Plays board cells in order, each by whoever may play it, waiting until every phone shows the move. */
export async function playCells(pages, cells) {
  const cell = (page, i) => board(page).getByRole("button").nth(i);
  for (const i of cells) {
    const mover = await whoever(pages, (page) => cell(page, i).and(page.locator(":enabled")));
    await cell(mover, i).click();
    for (const page of pages) await cell(page, i).and(page.locator(":disabled")).waitFor({ timeout: 5_000 });
  }
}
