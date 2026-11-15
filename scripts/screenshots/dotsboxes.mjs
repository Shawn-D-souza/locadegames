// Dots & Boxes' own screens: whose turn (yours and another's), a box won (go again), quitting, the winner's ending,
// another's place, the party's results (RANKING with boxes), and a full room of 8 on the biggest board.
import { sees, wait } from "../playtest/session.mjs";
import { board, whoever } from "./camera.mjs";

const enabledLines = (page) => board(page).getByRole("button").and(page.locator(":enabled"));

/** Where this phone's player sits in the turn order: their place in the players' row above the board. */
async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

/** Whoever's turn it is draws the line named by its number on a board `size` boxes across. */
async function draw(players, size, line) {
  const across = size * (size + 1);
  const horizontal = line < across;
  const row = horizontal ? Math.floor(line / size) : Math.floor((line - across) / (size + 1));
  const col = horizontal ? line % size : (line - across) % (size + 1);
  const to = horizontal ? `row ${row + 1}, column ${col + 2}` : `row ${row + 2}, column ${col + 1}`;
  const name = `Line from row ${row + 1}, column ${col + 1} to ${to}`;
  const target = (page) => board(page).getByRole("button", { name, exact: true }).and(page.locator(":enabled"));
  const mover = await whoever(players, target);
  await target(mover).click();
  await board(mover).getByRole("button", { name, exact: true }).waitFor({ state: "detached", timeout: 5_000 });
}

/** The sides of box `box` on a board `size` across: top, right, bottom, left. */
function sides(size, box) {
  const row = Math.floor(box / size);
  const col = box % size;
  const left = size * (size + 1) + row * (size + 1) + col;
  return [row * size + col, left + 1, (row + 1) * size + col, left];
}

export default async function dotsboxes(camera) {
  const players = await camera.room(3);
  await players[0].getByRole("button", { name: /dots & boxes/i }).click();
  for (const page of players) await board(page).waitFor();
  const order = [];
  for (const page of players) order[await seatOf(page)] = page;
  // 6×6: a few boxes' worth of lines, so the board looks mid-game; box 7 gets three sides, box 14 two.
  const size = 6;
  for (const line of [...sides(size, 0).slice(0, 3), ...sides(size, 7).slice(0, 3), ...sides(size, 14).slice(0, 2), 40, 60, 81]) await draw(players, size, line);
  await wait(500);
  await camera.shoot(await whoever(players, (page) => enabledLines(page).first()), "your-turn");
  // Whoever moves next closes box 0 and draws again.
  const closer = await whoever(players, (page) => enabledLines(page).first());
  await draw(players, size, sides(size, 0)[3]);
  await sees(closer, /box! go again!/i);
  await wait(600);
  await camera.shoot(closer, "box-go-again");
  await camera.shoot(players.find((page) => page !== closer), "their-turn");
  // Close box 7 too, then the next player quits.
  await draw(players, size, sides(size, 7)[3]);
  const quitter = players.find((page) => page !== closer);
  await quitter.getByRole("button", { name: "Quit game" }).click();
  await camera.shoot(quitter, "quit-popup", { screen: true });
  await quitter.getByRole("button", { name: "QUIT", exact: true }).click();
  const third = players.find((page) => page !== closer && page !== quitter);
  await third.getByRole("button", { name: "Quit game" }).click();
  await third.getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(closer, /you win!/i);
  await wait(1_200);
  await Promise.all([camera.shoot(closer, "won"), camera.shoot(third, "place")]);
  await sees(closer, /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(closer, "results");

  // A full room: 8 players on the 8×8 board, a few lines in.
  const eight = await camera.room(8);
  await eight[0].getByRole("button", { name: /dots & boxes/i }).click();
  for (const page of eight) await board(page).waitFor();
  for (const line of [...sides(8, 9).slice(0, 4), ...sides(8, 27).slice(0, 3), 60, 100, 130]) await draw(eight, 8, line);
  await wait(600);
  await camera.shoot(eight[0], "eight-players");
}
