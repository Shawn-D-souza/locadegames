// Memory's own screens: your turn with a card up, a miss showing, a pair found (go again), someone else's turn,
// quitting, the winner's ending, another's place, the party's results (RANKING with pairs), and a full room of 8 on the
// 6 × 7 board. Cards are loaded (the dev server lets a screenshot say what a card turns out to be).
import { sees, wait } from "../playtest/session.mjs";
import { whoever } from "./camera.mjs";

const cards = (page) => page.getByRole("group", { name: "Cards" });
const card = (page, n) => cards(page).getByRole("button", { name: new RegExp(`^Card ${n + 1}(:|$)`) });

/** Whoever's turn it is turns card `n` (dealt as `deal` if it's never been turned); returns once it shows, and who turned it. */
async function turn(players, n, deal) {
  const mover = await whoever(players, (page) => card(page, n).and(page.locator(":enabled")));
  await mover.evaluate((d) => {
    window.loadedCards = d ? [d] : [];
  }, deal ?? null);
  await card(mover, n).click();
  await cards(mover).getByRole("button", { name: new RegExp(`^Card ${n + 1}: `) }).waitFor({ timeout: 5_000 });
  return mover;
}

/** A pair found by whoever's turn it is, on two cards never turned. */
async function pair(players, a, b) {
  await turn(players, a, "new");
  return turn(players, b, "match");
}

/** A miss by whoever's turn it is: two cards never turned, waiting until they've turned back. */
async function miss(players, a, b) {
  await turn(players, a, "new");
  const mover = await turn(players, b, "new");
  await cards(mover).getByRole("button", { name: `Card ${b + 1}`, exact: true }).waitFor({ timeout: 5_000 });
}

export default async function memory(camera) {
  const players = await camera.room(3);
  await players[0].getByRole("button", { name: /memory/i }).click();
  for (const page of players) await cards(page).waitFor();
  // A few turns in: a miss each for two players, then a pair for the third.
  await miss(players, 0, 1);
  await miss(players, 6, 7);
  await pair(players, 9, 14);
  const finder = await turn(players, 20, "new");
  await wait(500);
  await camera.shoot(finder, "one-more-card");
  await camera.shoot(players.find((page) => page !== finder), "their-turn");
  const missed = await turn(players, 21, "new");
  await wait(500);
  await camera.shoot(missed, "miss");
  await cards(missed).getByRole("button", { name: "Card 22", exact: true }).waitFor({ timeout: 5_000 });
  // The next player finds a pair and goes again.
  const next = await pair(players, 2, 3);
  await sees(next, /pair! go again!/i);
  await wait(700);
  await camera.shoot(next, "pair");
  const quitter = players.find((page) => page !== next);
  await quitter.getByRole("button", { name: "Quit game" }).click();
  await camera.shoot(quitter, "quit-popup", { screen: true });
  await quitter.getByRole("button", { name: "QUIT", exact: true }).click();
  const third = players.find((page) => page !== next && page !== quitter);
  await third.getByRole("button", { name: "Quit game" }).click();
  await third.getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(next, /you win!/i);
  await wait(1_200);
  await Promise.all([camera.shoot(next, "won"), camera.shoot(third, "place")]);
  await sees(next, /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(next, "results");

  // A full room: 8 players on the 6 × 7 board, a few pairs found and a card up.
  const eight = await camera.room(8);
  await eight[0].getByRole("button", { name: /memory/i }).click();
  for (const page of eight) await cards(page).waitFor();
  await pair(eight, 0, 7);
  await miss(eight, 13, 20);
  await pair(eight, 30, 35);
  await miss(eight, 5, 9);
  await turn(eight, 16, "new");
  await wait(600);
  await camera.shoot(eight[0], "eight-players");
}
