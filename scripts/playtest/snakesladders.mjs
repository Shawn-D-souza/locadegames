// Snakes & Ladders: three players, one roll at a time, with loaded dice (the dev server lets playtests choose them, so
// every moment comes at once): a ladder, a 6 rolling again, three 6s sending a piece back, a snake, a roll too big to
// finish, the first player home while the game goes on, a quit that leaves one racer and ends it, each phone's ending,
// the results, back to the room. The squares follow the board in `src/shared/games/snakesladders/board.ts`.
import { felt, heard, sees } from "./session.mjs";

const rollButton = (page) => page.getByRole("button", { name: /^roll/i });

/** Waits until `page` may roll, loads `die`, rolls, and waits until the roll has gone (the button leaves). */
export async function roll(page, die) {
  await rollButton(page).waitFor({ timeout: 10_000 });
  await page.evaluate((d) => {
    window.loadedDice = [d];
  }, die);
  await rollButton(page).click();
  await rollButton(page).waitFor({ state: "detached", timeout: 5_000 });
}

/** Where this phone's player sits in the turn order: their place in the players' row. */
export async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

/** Waits until `page`'s board (as it tells screen readers: "Ana: square 23, …") says `who` is on `square`. */
async function standsOn(page, who, square) {
  await page.getByRole("img", { name: new RegExp(`${who}: square ${square}(,|$)`) }).waitFor({ timeout: 8_000 });
}

export default async function snakesladders(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  let names = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Snakes & Ladders; everyone sees the board, and only the first in turn order may roll", async () => {
    await players[0].getByRole("button", { name: /snakes & ladders/i }).click();
    for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    names = await order[0].getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label").split(/ \(you\)|,/)[0]));
    await rollButton(order[0]).waitFor();
    if (await rollButton(order[1]).count()) throw new Error("the second player may roll on the first player's turn");
    await sees(order[1], /'s? turn/i);
    await heard(players[0], "gameStarting");
  });
  await session.step("a 3 climbs the ladder to 23 on every phone (heard and felt by the roller)", async () => {
    await roll(order[0], 3);
    for (const page of players) await standsOn(page, names[0], 23);
    await rollButton(order[1]).waitFor();
    await heard(order[0], "snakesLaddersDieRoll", "snakesLaddersHop", "snakesLaddersLadder");
    await felt(order[0], "snakesLaddersDieLands", "snakesLaddersLadder");
    await heard(order[2], "snakesLaddersLadder");
  });
  await session.step("a 6 rolls again; three 6s in a row put the piece back off the board", async () => {
    await roll(order[1], 6);
    await sees(order[1], /roll again!/i);
    await heard(order[1], "snakesLaddersSix");
    await roll(order[1], 6);
    await roll(order[1], 6);
    await sees(order[1], /three 6s! back you go/i);
    await order[0].getByRole("img", { name: new RegExp(`${names[1]}: not on the board yet`) }).waitFor({ timeout: 8_000 });
    await felt(order[1], "snakesLaddersSix", "snakesLaddersThreeSixes");
  });
  await session.step("a 2 onto the snake at 24 slides the piece down to 8", async () => {
    for (const die of [6, 6, 4]) await roll(order[2], die); // 16
    await roll(order[0], 5); // 28
    await roll(order[1], 1);
    await roll(order[2], 6);
    await roll(order[2], 2);
    for (const page of players) await standsOn(page, names[2], 8);
    await rollButton(order[0]).waitFor();
    await heard(order[2], "snakesLaddersSnake");
    await felt(order[2], "snakesLaddersSnake");
  });
  await session.step("two more rounds take the first player up two more ladders to 90", async () => {
    for (const [mover, dice] of [
      [0, [6, 2]],
      [1, [1]],
      [2, [1]],
      [0, [4]],
      [1, [2]],
      [2, [1]],
    ]) {
      for (const die of dice) await roll(order[mover], die);
    }
    await standsOn(order[1], names[0], 90);
  });
  await session.step("from 96 a 5 is too many: the piece stays and the roller is told what they need", async () => {
    await roll(order[0], 6);
    await roll(order[0], 5);
    await sees(order[0], /you need a 4!/i);
    await standsOn(order[1], names[0], 96);
    await heard(order[0], "snakesLaddersStuck");
    await roll(order[1], 1);
    await roll(order[2], 2);
  });
  await session.step("a 4 takes the first player home 1st, and the game goes on for the others", async () => {
    await roll(order[0], 4);
    await sees(order[0], /you're 1st!/i);
    await sees(order[1], /is 1st!/i);
    await sees(order[0], /you're 1st · watching/i);
    await rollButton(order[1]).waitFor();
    await heard(order[0], "snakesLaddersHome");
    await felt(order[0], "snakesLaddersHome");
  });
  await session.step("the second player quits: only one racer is left, so the game ends; each phone gets its ending", async () => {
    await order[1].getByRole("button", { name: "Quit game" }).click();
    await order[1].getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(order[0], /you win!/i);
    await sees(order[2], /you're 2nd/i);
    await heard(order[0], "boardThump", "matchWinFanfare");
    await felt(order[0], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /snakes & ladders/i }).waitFor();
  });
}
