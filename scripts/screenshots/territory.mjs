// Territory's own screens: the countdown, a trail out of your land, the loop become land, a cut (the cutter's notice,
// the cut player's out card, then watching), quitting, the winner's ending and the arena's results (RANKING).
// Heads are steered through the dev-only `window.territory` (the netcode client), as in the playtest.
import { sees, wait } from "../playtest/session.mjs";

/** This phone's player id and start position. */
const read = (page) =>
  page.evaluate(() => {
    const c = window.territory;
    const head = c.replica.players.get(c.options.myId).head;
    return { id: c.options.myId, x: head.x, y: head.y };
  });

/** Steers along waypoints (world units), one after the other, circling the last. */
const steer = (page, route) =>
  page.evaluate((points) => {
    clearInterval(window.screenshotSteer);
    let leg = 0;
    window.screenshotSteer = setInterval(() => {
      const c = window.territory;
      const head = c.replica.players.get(c.options.myId)?.head;
      if (!head) return;
      const to = points[Math.min(leg, points.length - 1)];
      if (Math.hypot(to.x - head.x, to.y - head.y) < 900 && leg < points.length - 1) leg += 1;
      c.steer(Math.round(((Math.atan2(to.y - head.y, to.x - head.x) / (2 * Math.PI)) * 4096 + 4096) % 4096));
    }, 50);
  }, route);

const share = (page) => page.evaluate(() => window.territory.hud(performance.now()).shares.find((s) => s.id === window.territory.options.myId)?.share ?? 0);

export default async function territory(camera) {
  const [builder, cutter, victim] = await camera.room(3);
  await builder.getByRole("button", { name: /territory/i }).click();
  for (const page of [builder, cutter, victim]) await page.waitForFunction(() => window.territory?.replica.players.size === 3, null, { timeout: 10_000 });
  const [b, c, v] = await Promise.all([builder, cutter, victim].map(read));
  // The two who wait circle their starts, so they don't wander into the builder's loop.
  await Promise.all([steer(cutter, [c]), steer(victim, [v])]);
  await camera.shoot(builder, "countdown");
  await builder.waitForFunction(() => window.territory.hud(performance.now()).countdownMs <= 0, null, { timeout: 8_000 });

  // A loop out from the land (away from the middle) and home again.
  const length = Math.hypot(b.x, b.y);
  const out = { x: b.x / length, y: b.y / length };
  const at = (k, m) => ({ x: b.x + out.x * k - out.y * m, y: b.y + out.y * k + out.x * m });
  const before = await share(builder);
  await steer(builder, [at(5000, 0), at(5000, 5000), at(0, 5000), at(-1000, 0)]);
  // Far out on the loop's second leg: a long trail behind, not home yet.
  await builder.waitForFunction(
    (corner) => {
      const head = window.territory.replica.players.get(window.territory.options.myId).head;
      return Math.hypot(corner.x - head.x, corner.y - head.y) < 1_500;
    },
    at(5000, 5000),
    { timeout: 15_000 },
  );
  await camera.shoot(builder, "trail");
  for (const started = Date.now(); (await share(builder)) <= before * 1.5; await wait(100)) {
    if (Date.now() - started > 25_000) throw new Error("the loop never became land");
  }
  await wait(600);
  await camera.shoot(builder, "captured");

  // The victim heads for the middle and past it; the cutter crosses their trail on the way.
  const mid = { x: v.x * 0.5, y: v.y * 0.5 };
  await steer(victim, [{ x: 0, y: 0 }, { x: -v.x * 0.6, y: -v.y * 0.6 }]);
  await steer(cutter, [mid, { x: mid.x + (mid.x - c.x) * 0.4, y: mid.y + (mid.y - c.y) * 0.4 }]);
  await sees(victim, /you're out/i, 25_000);
  await steer(cutter, [c]);
  await wait(600);
  await Promise.all([camera.shoot(cutter, "cut"), camera.shoot(victim, "out")]);
  await wait(4_500);
  await camera.shoot(victim, "watching");

  await cutter.getByRole("button", { name: "Quit match" }).click();
  await camera.shoot(cutter, "quit-popup", { screen: true });
  await cutter.getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(builder, /you win!/i);
  // Once the land share on its tag has counted up.
  await wait(2_000);
  await camera.shoot(builder, "ending");
  await sees(builder, /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(builder, "results");
}
