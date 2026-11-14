// Dots Clash's own screens: three players picking their starts at once, whose turn (yours and another's), knocked out,
// quitting, the winner's ending, another's place, and the party's results (RANKING).
import { sees, wait } from "../playtest/session.mjs";
import { board, whoever } from "./camera.mjs";

const enabledCells = (page) => board(page).getByRole("button").and(page.locator(":enabled"));

/** Whoever may tap taps their first cell they may; returns once the turn has moved on. */
async function tap(players) {
  const mover = await whoever(players, (page) => enabledCells(page).first());
  const target = await enabledCells(mover).first().elementHandle();
  await target.click();
  await mover.waitForFunction((button) => button.disabled, target, { timeout: 5_000 });
}

/** Where this phone's player sits in the turn order: their place in the players' row above the board. */
async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

export default async function dotsclash(camera) {
  const players = await camera.room(3);
  await players[0].getByRole("button", { name: /dots clash/i }).click();
  for (const page of players) await sees(page, /pick your start!/i);
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  // 7×7: the last two in turn order pick first (side by side and far away); the first is still picking.
  await board(order[1]).getByRole("button").nth(1).click();
  await board(order[2]).getByRole("button").nth(30).click();
  await sees(order[2], /waiting for /i);
  await camera.shoot(order[0], "picking");
  await board(order[0]).getByRole("button").nth(0).click();
  await sees(order[0], /your turn!/i);
  // Two rounds fill everyone's cell to 3; the first player's next tap bursts and takes the second out.
  for (let i = 0; i < 6; i++) await tap(players);
  await sees(order[0], /your turn!/i);
  await wait(500);
  await camera.shoot(order[0], "your-turn");
  await camera.shoot(order[1], "their-turn");
  await tap(players);
  await sees(order[1], /you're out/i);
  await wait(1_500);
  await camera.shoot(order[1], "out");
  await order[2].getByRole("button", { name: "Quit game" }).click();
  await camera.shoot(order[2], "quit-popup", { screen: true });
  await order[2].getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(order[0], /you win!/i);
  await wait(1_200);
  await Promise.all([camera.shoot(order[0], "won"), camera.shoot(order[1], "place")]);
  await sees(order[0], /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(order[0], "results");
}
