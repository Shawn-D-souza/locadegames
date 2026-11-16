// Memory: three players on a 6 × 6 board, with loaded cards (the dev server lets playtests say what a card turns out to
// be, so every moment comes at once). A miss shown to everyone that turns back and passes the turn on, nobody turning
// out of turn, a pair (heard and felt) that's yours and goes again, a quit on your own turn that skips you, the last
// player clearing the board, each phone's ending, the results with everyone's pairs, back to the room.
import { felt, heard, sees } from "./session.mjs";

const cards = (page) => page.getByRole("group", { name: "Cards" });
/** Card `card` (0-based) as the board names it: "Card 3", "Card 3: red star", "Card 3: red star, found". */
const card = (page, n) => cards(page).getByRole("button", { name: new RegExp(`^Card ${n + 1}(:|$)`) });

/** `page` turns card `n` (once it may), dealt as `deal` if it's never been turned; returns once it shows face up. */
async function turn(page, n, deal) {
  await card(page, n).and(page.locator(":enabled")).waitFor({ timeout: 8_000 });
  await page.evaluate((d) => {
    window.loadedCards = d ? [d] : [];
  }, deal ?? null);
  await card(page, n).click();
  await cards(page).getByRole("button", { name: new RegExp(`^Card ${n + 1}: `) }).waitFor({ timeout: 5_000 });
}

/** Where this phone's player sits in the turn order: their place in the players' row above the board. */
async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

export default async function memory(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Memory; everyone sees 36 cards face down, and the first in turn order is told it's their turn", async () => {
    await players[0].getByRole("button", { name: /memory/i }).click();
    for (const page of players) await cards(page).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    const count = await cards(order[1]).getByRole("button").count();
    if (count !== 36) throw new Error(`${count} cards, not 36`);
    await sees(order[0], /your turn!/i);
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
  });
  await session.step("a first card shows on every phone; then a second that doesn't match shows to everyone, turns back, and passes the turn on", async () => {
    await turn(order[0], 0);
    await sees(order[0], /one more card!/i);
    await card(order[1], 0).and(order[1].getByRole("button", { name: /^Card 1: / })).waitFor();
    if (await card(order[1], 5).isEnabled()) throw new Error("the next player can turn a card out of turn");
    await turn(order[0], 1, "new");
    await cards(order[0]).getByRole("button", { name: "Card 2", exact: true }).waitFor({ timeout: 5_000 });
    await sees(order[1], /your turn!/i);
    await heard(order[2], "memoryFlip", "memoryFlip", "memoryMiss", "memoryTurnBack");
  });
  await session.step("a pair is yours (heard and felt), shows on the players' row, and you go again", async () => {
    await turn(order[1], 2, "new");
    await turn(order[1], 3, "match");
    await sees(order[1], /pair! go again!/i);
    await order[0].getByRole("listitem", { name: /1 points/ }).waitFor();
    await cards(order[0]).getByRole("button", { name: /^Card 4: .*, found$/ }).waitFor();
    await heard(order[1], "memoryFlip", "memoryYourPair");
    await heard(order[0], "memoryFlip", "memoryPair");
    await felt(order[1], "memoryTap", "memoryYourPair");
  });
  await session.step("the pair's finder quits on their own turn: everyone is told, and the turn skips to the third", async () => {
    await order[1].getByRole("button", { name: "Quit game" }).click();
    await order[1].getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(order[0], / quit$/i);
    await sees(order[2], /your turn!/i);
    await felt(order[2], "memoryYourTurn");
  });
  await session.step("the third player finds every pair left, and each phone gets its own ending", async () => {
    // Cards 0 and 1 were turned before (two pictures nobody else has): each gets its partner; then the rest in twos.
    const pairs = [
      [0, 4],
      [1, 5],
      ...Array.from({ length: 15 }, (_, i) => [6 + 2 * i, 7 + 2 * i]),
    ];
    for (const [a, b] of pairs) {
      await turn(order[2], a, a > 1 ? "new" : undefined);
      await turn(order[2], b, "match");
    }
    await sees(order[2], /you win!/i);
    await sees(order[0], /you're 2nd/i);
    await sees(order[1], /you're 3rd/i);
    await heard(order[2], "memoryYourPair", "boardThump", "matchWinFanfare");
    await felt(order[2], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking with everyone's pairs", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
    await order[0].getByLabel("17 points").waitFor();
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /memory/i }).waitFor();
  });
}
