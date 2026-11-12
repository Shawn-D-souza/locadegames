// Dots Clash: three players on one board. Starts picked by everyone at once in secret (revealed together), a chain that
// knocks one player out, a quit that greys a player out and ends the game, each phone's ending, the results, back to
// the room.
import { felt, heard, sees } from "./session.mjs";

const board = (page) => page.getByRole("group", { name: "Board" });
const enabledCells = (page) => board(page).getByRole("button").and(page.locator(":enabled"));

/** Waits for whoever may tap now, taps `cell` (or their first cell they may tap), and returns their page. */
async function tap(players, cell = null) {
  const mover = await Promise.any(
    players.map(async (page) => {
      await enabledCells(page).first().waitFor({ timeout: 8_000 });
      return page;
    }),
  );
  const target = await (cell === null ? enabledCells(mover).first() : board(mover).getByRole("button").nth(cell)).elementHandle();
  await target.click();
  // The turn has moved on once the cell you tapped can't be tapped again.
  await mover.waitForFunction((button) => button.disabled, target, { timeout: 5_000 });
  return mover;
}

/** Where this phone's player sits in the turn order: their place in the players' row above the board. */
async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

/** Taps `cell` to pick a start and waits until the phone has taken it (its board shows it as theirs). */
async function pickStart(page, cell) {
  const target = await board(page).getByRole("button").nth(cell).elementHandle();
  await target.click();
  await page.waitForFunction((button) => button.disabled, target, { timeout: 5_000 });
}

export default async function dotsclash(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Dots Clash; everyone sees the board and is asked to pick a start, all at once", async () => {
    await players[0].getByRole("button", { name: /dots clash/i }).click();
    for (const page of players) await board(page).waitFor();
    for (const page of players) await sees(page, /pick your start!/i);
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
  });
  await session.step("picks are secret: the last two in turn order pick first, and nobody else's board shows them", async () => {
    // 7×7 board: cells 0 and 1 touch, 30 is far from both. Picked out of turn order on purpose.
    await pickStart(order[1], 1);
    await pickStart(order[2], 30);
    await sees(order[2], /waiting for /i);
    for (const cell of [1, 30]) {
      const label = await board(order[0]).getByRole("button").nth(cell).getAttribute("aria-label");
      if (!/empty/.test(label)) throw new Error(`the first player's board shows someone's secret pick: ${label}`);
    }
  });
  await session.step("the last pick reveals every start at once (each player's note), and the first player's turn begins", async () => {
    await pickStart(order[0], 0);
    await sees(order[0], /your turn!/i);
    for (const page of players) await board(page).getByRole("button", { name: /column 2, .*1 dots/ }).first().waitFor();
    await heard(order[2], "dotsClashStartPicked", "dotsClashStartPicked", "dotsClashStartPicked", "dotsClashStartPicked");
  });
  await session.step("two rounds of taps fill everyone's cell to 3; the first player's next tap bursts (felt each wave) and takes the second out (felt)", async () => {
    for (let i = 0; i < 7; i++) await tap(players);
    await sees(order[1], /you're out/i);
    await heard(order[0], "dotsClashDotAdded", "dotsClashBurst", "dotsClashBurst", "dotsClashPlayerOut");
    await heard(order[1], "dotsClashBurst", "dotsClashYouAreOut");
    await felt(order[0], "dotsClashStartsRevealed", "dotsClashTap", "dotsClashBurst", "dotsClashBurst", "dotsClashKnockedSomeoneOut");
    await felt(order[1], "dotsClashOut");
    await sees(order[0], /is out!/i);
  });
  await session.step("the third player quits: their dots turn grey and the first player wins", async () => {
    await order[2].getByRole("button", { name: "Quit game" }).click();
    await order[2].getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(order[0], /you win!/i);
    await sees(order[1], /you're 3rd/i);
    await heard(order[0], "boardThump", "matchWinFanfare");
    await felt(order[0], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /dots clash/i }).waitFor();
  });
}
