// Head Crash: two players. One drives up the wall until heads get hit, round after round; a third joins late
// and watches the live match; the match ends at five points (or as it stands), then the results.
// The driver uses the real keys; the dev-only `window.headcrash` (the netcode client) is read for the score.
import { felt, heard, sees, wait } from "./session.mjs";

const hud = (page) => page.evaluate(() => window.headcrash?.hud() ?? null);
const stats = (page) => page.evaluate(() => ({ ...window.headcrash.stats }));
const total = (view) => (view?.synced ? view.score[0] + view.score[1] : 0);

async function until(check, what, timeout = 25_000) {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeout) throw new Error(`timed out waiting for ${what}`);
    await wait(50);
  }
}

export default async function headcrash(session) {
  let host, guest, late;
  let watchedFrom = 0;
  await session.step("2 players in a room", async () => {
    [host, guest] = await session.room(2);
  });
  await session.step("the host starts Head Crash; both see the arena, the score and the countdown", async () => {
    await host.getByRole("button", { name: /head crash/i }).click();
    for (const page of [host, guest]) {
      await page.waitForFunction(() => window.headcrash?.hud().synced === true, null, { timeout: 10_000 });
      await page.getByRole("button", { name: "Drive left" }).waitFor();
      await page.getByRole("button", { name: "Drive right" }).waitFor();
    }
    if ((await hud(host)).countdown < 1) throw new Error("no countdown at the start");
    await until(async () => (await hud(host)).countdown === 0, "the countdown to end", 6_000);
    await wait(300);
    await heard(host, "gameStarting", "countdownTick", "countdownGo");
    await felt(host, "gameStarting", "countdownTick", "go");
  });
  await session.step("holding a button drives the car, on both phones", async () => {
    const before = await host.evaluate(() => window.headcrash.frame(performance.now()).cars.map((c) => c.x));
    await host.keyboard.down("ArrowRight");
    await host.getByRole("button", { name: "Drive right", pressed: true }).waitFor({ timeout: 2_000 });
    // Within a moment (setting off can take a little longer, on a lift or up a slope).
    const where = () => host.evaluate(() => ({ seat: window.headcrash.options.mySeat, cars: window.headcrash.frame(performance.now()).cars.map((c) => c.x) }));
    let mine = await where();
    const started = Date.now();
    while (mine.cars[mine.seat] - before[mine.seat] < 1 && Date.now() - started < 2_000) {
      await wait(50);
      mine = await where();
    }
    if (mine.cars[mine.seat] - before[mine.seat] < 1) throw new Error(`the car didn't drive: ${before[mine.seat]} → ${mine.cars[mine.seat]}`);
    // Your own car's motor is heard (each phone runs its own).
    await heard(host, "headCrashMotorLoop");
    // The other phone draws it a moment later (the trip over the network), so it gets a little longer.
    const seen = async () => {
      const theirs = await guest.evaluate(() => window.headcrash.frame(performance.now()).cars.map((c) => c.x));
      return Math.abs(theirs[mine.seat] - before[mine.seat]) >= 1;
    };
    await until(seen, "the other phone to see the car drive", 1_500);
  });
  await session.step("a head is hit: a point, the burst's sound, and the next round starts in a new arena", async () => {
    await until(async () => total(await hud(host)) > 0 || (await hud(host)).round > 0, "the first hit", 60_000);
    const view = await hud(host);
    if (total(view) > 0) {
      const seat = await host.evaluate(() => window.headcrash.options.mySeat);
      const scored = view.score[seat] > 0;
      await heard(host, scored ? "headCrashYouScored" : "headCrashYouWereHit");
      await heard(guest, scored ? "headCrashYouWereHit" : "headCrashYouScored");
      await felt(host, scored ? "headCrashYouScored" : "headCrashYouWereHit");
      // The score bar shows it on both phones.
      for (const page of [host, guest]) await page.getByRole("status", { name: new RegExp(` ${view.score[0]}, .* ${view.score[1]}$`) }).waitFor({ timeout: 3_000 });
    } else await heard(host, "headCrashBothHeadsHit");
    await until(async () => (await hud(host)).round > 0 && (await hud(host)).countdown > 0, "the next round's countdown", 6_000);
  });
  await session.step("on a local connection nothing is ever corrected by much", async () => {
    for (const page of [host, guest]) {
      const s = await stats(page);
      if (s.snapshots < 60) throw new Error(`too few snapshots: ${s.snapshots}`);
      if (s.largestCorrection > 1.5) throw new Error(`a car was moved ${s.largestCorrection.toFixed(2)} m by a correction`);
    }
  });
  await session.step("someone joining late watches the live match", async () => {
    const code = new URL(host.url()).searchParams.get("room");
    late = await session.player("late");
    await late.goto(`${session.base}?room=${code}`);
    await late.getByRole("button", { name: /join room/i }).click();
    await late.getByRole("button", { name: /^watch /i }).click();
    await sees(late, /watching live/i);
    await late.waitForFunction(() => window.headcrash?.hud().synced === true, null, { timeout: 10_000 });
    const first = await stats(late);
    await wait(700);
    if ((await stats(late)).snapshots - first.snapshots < 10) throw new Error("the watcher isn't getting the match");
    if ((await late.getByRole("button", { name: "Drive left" }).count()) > 0) throw new Error("a watcher has drive buttons");
    if ((await late.evaluate(() => window.soundLog ?? [])).includes("headCrashMotorLoop")) throw new Error("a watcher hears a motor");
    watchedFrom = total(await hud(host));
  });
  await session.step("the match is played to its end; each phone gets its own ending", async () => {
    await sees(host, /you win!|you lost|draw!/i, 240_000);
    await host.keyboard.up("ArrowRight");
    await sees(guest, /you win!|you lost|draw!/i);
    await sees(late, /wins!|draw!/i);
    const won = (await host.getByText(/you win!/i).count()) > 0;
    const drawn = (await host.getByText(/draw!/i).count()) > 0;
    await wait(1_200);
    await heard(host, drawn ? "matchDrawShrug" : won ? "matchWinFanfare" : "matchLossSting");
    await heard(guest, drawn ? "matchDrawShrug" : won ? "matchLossSting" : "matchWinFanfare");
    await heard(late, drawn ? "matchDrawShrug" : "matchWatchedResult");
    // The watcher heard the hits from afar, and felt none of them.
    if (total(await hud(host)) > watchedFrom) await heard(late, "headCrashWatchedHit");
    const feltByWatcher = await late.evaluate(() => (window.hapticLog ?? []).filter((name) => name.startsWith("headCrash")));
    if (feltByWatcher.length) throw new Error(`a watcher felt ${feltByWatcher.join(", ")}`);
  });
  await session.step("the results come by themselves", async () => {
    for (const page of [host, guest]) await sees(page, /champion/i, 15_000);
  });
}
