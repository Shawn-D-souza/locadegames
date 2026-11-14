// Snakes & Ladders' own screens (loaded dice, so every look comes at once): rolling again, your roll and another's with
// pieces on the board (two sharing a square), home and watching while the others race, the winner's ending, another's
// place, the results.
import { roll, seatOf } from "../playtest/snakesladders.mjs";
import { sees, wait } from "../playtest/session.mjs";

/** Long enough for a roll to play out on screen before a photo. */
const SETTLE_MS = 2_500;

export default async function snakesladders(camera) {
  const players = await camera.room(3);
  await players[0].getByRole("button", { name: /snakes & ladders/i }).click();
  for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  // Up a ladder, down a snake, two pieces sharing a square: 0 climbs 3 → 23, then 28; 1 climbs too, then slides 24 → 8;
  // 2 rolls 6 (again), 6, 4 → 16, then 6, 2 → 24 and slides to 8 as well.
  await roll(order[0], 3);
  await roll(order[1], 3);
  await roll(order[2], 6);
  await wait(SETTLE_MS);
  await camera.shoot(order[2], "roll-again");
  await roll(order[2], 6);
  await roll(order[2], 4);
  await roll(order[0], 5);
  await roll(order[1], 1);
  await roll(order[2], 6);
  await roll(order[2], 2);
  await wait(SETTLE_MS);
  await camera.shoot(order[0], "your-turn");
  await camera.shoot(order[1], "their-turn");
  // 0 races home: 28 → 34 → 36 (ladder to 64) → 68 (ladder to 90) → 96 → 100.
  for (const [mover, dice] of [
    [0, [6, 2]],
    [1, [1]],
    [2, [1]],
    [0, [4]],
    [1, [1]],
    [2, [1]],
    [0, [6, 4]],
  ]) {
    for (const die of dice) await roll(order[mover], die);
  }
  await sees(order[0], /you're 1st!/i);
  await wait(SETTLE_MS);
  await camera.shoot(order[0], "home-watching");
  await order[1].getByRole("button", { name: "Quit game" }).click();
  await order[1].getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(order[0], /you win!/i);
  await wait(1_200);
  await Promise.all([camera.shoot(order[0], "won"), camera.shoot(order[2], "place")]);
  await sees(order[0], /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(order[0], "results");
}
