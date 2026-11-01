// Territory: three players. One captures land, one cuts another, the last quits, the winner's ending plays,
// then the results. Players are steered through the dev-only `window.territory` (the netcode client).
import { sees, wait } from "./session.mjs";

/** The player's id and everyone's start positions, from the netcode client. */
const read = (page) =>
  page.evaluate(() => {
    const c = window.territory;
    return { me: c.options.myId, spawns: Object.fromEntries([...c.replica.players.values()].map((p) => [p.id, { x: p.head.x, y: p.head.y }])) };
  });

/** Steers along waypoints (world units), one after the other, holding the last. */
const steer = (page, route) =>
  page.evaluate((points) => {
    clearInterval(window.playtestSteer);
    let leg = 0;
    window.playtestSteer = setInterval(() => {
      const c = window.territory;
      const head = c.replica.players.get(c.options.myId)?.head;
      if (!head) return;
      const to = points[Math.min(leg, points.length - 1)];
      if (Math.hypot(to.x - head.x, to.y - head.y) < 900 && leg < points.length - 1) leg += 1;
      c.steer(Math.round(((Math.atan2(to.y - head.y, to.x - head.x) / (2 * Math.PI)) * 4096 + 4096) % 4096));
    }, 50);
  }, route);

const share = (page) => page.evaluate(() => window.territory.hud(performance.now()).shares.find((s) => s.id === window.territory.options.myId)?.share ?? 0);
const alive = (page, id) => page.evaluate((i) => window.territory.replica.players.get(i)?.alive ?? false, id);

async function until(check, what, timeout = 25_000) {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeout) throw new Error(`timed out waiting for ${what}`);
    await wait(50);
  }
}

export default async function territory(session) {
  let host, cutter, builder;
  let ids = {};
  let spawns = {};
  await session.step("3 players in a room", async () => {
    [host, cutter, builder] = await session.room(3);
  });
  await session.step("the host starts Territory; everyone sees the countdown", async () => {
    await host.getByRole("button", { name: /territory/i }).click();
    for (const page of [host, cutter, builder]) await page.waitForFunction(() => window.territory?.replica.players.size === 3, null, { timeout: 10_000 });
    const views = await Promise.all([host, cutter, builder].map(read));
    ids = { host: views[0].me, cutter: views[1].me, builder: views[2].me };
    spawns = views[0].spawns;
    await until(() => host.evaluate(() => window.territory.hud(performance.now()).countdownMs <= 0), "the countdown to end", 6_000);
  });
  await session.step("a loop out and home becomes land", async () => {
    const s = spawns[ids.builder];
    const length = Math.hypot(s.x, s.y);
    const out = { x: s.x / length, y: s.y / length };
    const side = { x: -out.y, y: out.x };
    const at = (k, m) => ({ x: s.x + out.x * k + side.x * m, y: s.y + out.y * k + side.y * m });
    const before = await share(builder);
    await steer(builder, [at(5000, 0), at(5000, 5000), at(0, 5000), at(-1000, 0)]);
    await until(async () => (await share(builder)) > before * 1.5, "the builder's land to grow");
  });
  await session.step("a cut: the cutter's stamp and notice, the host's out card", async () => {
    // The host heads for the middle and on past it; the cutter crosses the host's trail on the way.
    const h = spawns[ids.host];
    const mid = { x: h.x * 0.5, y: h.y * 0.5 };
    await steer(host, [{ x: 0, y: 0 }, { x: -h.x * 0.6, y: -h.y * 0.6 }]);
    await steer(cutter, [mid, { x: mid.x * 0.2, y: mid.y * 0.2 }]);
    await until(async () => !(await alive(host, ids.host)), "the host to be cut");
    await sees(cutter, /cut .+!/i);
    await sees(cutter, /you cut/i);
    await sees(host, /you're out/i);
  });
  await session.step("the builder quits: the cutter wins and sees the ending", async () => {
    await builder.getByRole("button", { name: "Quit match" }).click();
    await builder.getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(cutter, /you win!/i);
    await sees(builder, /you lost/i);
  });
  await session.step("the results come by themselves: the cutter is champion", async () => {
    for (const page of [host, cutter, builder]) await sees(page, /champion!/i, 15_000);
  });
}
