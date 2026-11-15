// Carrom's own screens: your shot at the start with the striker and its arrow (4 players: one on each side, everyone's
// color), someone else's shot (the board turned to their side), the board after a real break, the winner's ending (a
// loaded shot: the last coin in), the results with everyone's points. Shots are taken as players take them: the
// striker pulled back and let go.
import { pullStriker } from "../playtest/carrom.mjs";
import { seatOf } from "../playtest/snakesladders.mjs";
import { sees, wait } from "../playtest/session.mjs";

/** Long enough for a shot to play out on screen before a photo. */
const SETTLE_MS = 6_000;
/** Each side's striker middle at `at` along its baseline (board units), and the way it goes to the top left hole. */
const SPOT = [(at) => [50 + at, 85], (at) => [85, 50 - at], (at) => [50 - at, 15], (at) => [15, 50 + at]];
const HOLES = [
  [3, 3],
  [97, 3],
  [3, 97],
  [97, 97],
];

export default async function carrom(camera) {
  const players = await camera.room(4);
  await players[0].getByRole("button", { name: /^carrom/i }).click();
  for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  await order[0].locator("canvas[data-striker]").waitFor();
  await wait(600);
  await camera.shoot(order[0], "your-shot");
  await camera.shoot(order[1], "their-shot");

  // A real break, as hard as it goes.
  await pullStriker(order[0], 150);
  await wait(SETTLE_MS);
  await camera.shoot(order[2], "after-break");

  // Whoever's shot it is now pockets the last coin left (a white, into the hole ahead of them on their left).
  const shooter = await Promise.any(order.map((page, seat) => page.locator("canvas[data-striker]").waitFor({ timeout: 10_000 }).then(() => ({ page, seat }))));
  const side = shooter.seat;
  const at = -20;
  const [sx, sy] = SPOT[side](at);
  // The hole ahead on the shooter's left: top left for the bottom side, going round.
  const [hx, hy] = HOLES[[0, 2, 3, 1][side]];
  const length = Math.hypot(hx - sx, hy - sy);
  const table = Array.from({ length: 19 }, (_, i) => (i === 1 ? [sx + (hx - sx) * 0.75, sy + (hy - sy) * 0.75, true] : [0, 0, false]));
  await shooter.page.evaluate(
    ([t, shot]) => {
      window.loadedCarromShots = [{ table: t, ...shot, power: 0.42 }];
    },
    [table, { at, dx: (hx - sx) / length, dy: (hy - sy) / length }],
  );
  await pullStriker(shooter.page, 80);
  await sees(shooter.page, /you win!|shared win!/i);
  await wait(1_200);
  await camera.shoot(shooter.page, "won");
  await sees(shooter.page, /champion|shared title/i, 15_000);
  await wait(1_500);
  await camera.shoot(shooter.page, "results");
}
