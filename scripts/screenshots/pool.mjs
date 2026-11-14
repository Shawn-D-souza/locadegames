// Pool's own screens: your shot at the rack with the cue lined up (4 players: everyone's color), someone else's shot,
// the table after a real break, the winner's ending (a loaded shot: the black after all of theirs), the results. Shots
// are taken as players take them: the cue pulled back and let go.
import { pullCue } from "../playtest/pool.mjs";
import { seatOf } from "../playtest/snakesladders.mjs";
import { sees, wait } from "../playtest/session.mjs";

/** Long enough for a shot to play out on screen before a photo. */
const SETTLE_MS = 7_000;

export default async function pool(camera) {
  const players = await camera.room(4);
  await players[0].getByRole("button", { name: /^pool/i }).click();
  for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  await order[0].locator("canvas[data-cue]").waitFor();
  await wait(600);
  await camera.shoot(order[0], "your-shot");
  await camera.shoot(order[1], "their-shot");

  // A real break, as hard as it goes (past a full pull on every screen size, still on the screen).
  await pullCue(order[0], 150);
  await wait(SETTLE_MS);
  await camera.shoot(order[1], "after-break");

  // Whoever's shot it is now clears theirs and sinks the black.
  const shooter = await Promise.any(order.map((page, seat) => page.locator("canvas[data-cue]").waitFor({ timeout: 10_000 }).then(() => ({ page, seat }))));
  const balls = 1 + 1 + 4 * 3;
  const table = Array.from({ length: balls }, (_, i) => {
    if (i === 0) return [70, 15, true];
    if (i === 1) return [90, 5, true];
    const mine = Math.floor((i - 2) / 3) === shooter.seat;
    return mine ? [0, 0, false] : [10 + i * 5, 47.5, true];
  });
  await shooter.page.evaluate((t) => {
    window.loadedShots = [{ table: t, dx: 30 / Math.hypot(30, 15), dy: -15 / Math.hypot(30, 15), power: 0.6 }];
  }, table);
  await pullCue(shooter.page, 80);
  await sees(shooter.page, /you win!/i);
  await wait(1_200);
  await camera.shoot(shooter.page, "won");
  await sees(shooter.page, /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(shooter.page, "results");
}
