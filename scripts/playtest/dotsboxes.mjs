// Dots & Boxes: three players on one 6×6 board. Lines drawn in turn order, a box won by its fourth side (that player
// draws again), quits that skip a player and leave one winner, each phone's ending, the results, back to the room.
import { felt, heard, sees } from "./session.mjs";

/** 3 players: 6×6 boxes. Lines are numbered horizontal first (6 per row, rows 0–6), then vertical (7 per row). */
const SIZE = 6;
const ACROSS = SIZE * (SIZE + 1);
/** Box 0's sides: top, left, bottom, right. */
const BOX_0 = { top: 0, left: ACROSS, bottom: SIZE, right: ACROSS + 1 };

const board = (page) => page.getByRole("group", { name: "Board" });

/** The screen reader name of line `line` (as the board names it: the dots at its two ends). */
function lineName(line) {
  const horizontal = line < ACROSS;
  const row = horizontal ? Math.floor(line / SIZE) : Math.floor((line - ACROSS) / (SIZE + 1));
  const col = horizontal ? line % SIZE : (line - ACROSS) % (SIZE + 1);
  const to = horizontal ? `row ${row + 1}, column ${col + 2}` : `row ${row + 2}, column ${col + 1}`;
  return `Line from row ${row + 1}, column ${col + 1} to ${to}`;
}
const target = (page, line) => board(page).getByRole("button", { name: lineName(line), exact: true });

/** `page` draws `line` (it must be their turn); returns once it's drawn on their board. */
async function draw(page, line) {
  await target(page, line).and(page.locator(":enabled")).waitFor({ timeout: 8_000 });
  await target(page, line).click();
  await target(page, line).waitFor({ state: "detached", timeout: 5_000 });
}

/** Where this phone's player sits in the turn order: their place in the players' row above the board. */
async function seatOf(page) {
  const labels = await page.getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")));
  return labels.findIndex((label) => label.includes("(you)"));
}

export default async function dotsboxes(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Dots & Boxes; everyone sees the board, and the first in turn order is told it's their turn", async () => {
    await players[0].getByRole("button", { name: /dots & boxes/i }).click();
    for (const page of players) await board(page).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    await sees(order[0], /your turn!/i);
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
  });
  await session.step("a line each passes the turn round in order; nobody can draw out of turn", async () => {
    await draw(order[0], BOX_0.top);
    await draw(order[1], BOX_0.left);
    if (await target(order[1], BOX_0.right).isEnabled()) throw new Error("the second player can still draw after their line");
    await draw(order[2], BOX_0.bottom);
    await sees(order[0], /your turn!/i);
    await heard(order[1], "dotsBoxesLine", "dotsBoxesLine", "dotsBoxesLine");
  });
  await session.step("the fourth side wins the box (heard and felt), shows on the players' row, and that player draws again", async () => {
    await draw(order[0], BOX_0.right);
    await sees(order[0], /box! go again!/i);
    await order[1].getByRole("listitem", { name: /1 points/ }).waitFor();
    await heard(order[0], "dotsBoxesLine", "dotsBoxesYourBox");
    await heard(order[1], "dotsBoxesLine", "dotsBoxesBox");
    await felt(order[0], "dotsBoxesTap", "dotsBoxesYourBox");
    await draw(order[0], 20);
    await sees(order[1], /your turn!/i);
    await felt(order[1], "dotsBoxesYourTurn");
  });
  await session.step("the second player quits on their turn: everyone is told, and the turn skips to the third", async () => {
    await order[1].getByRole("button", { name: "Quit game" }).click();
    await order[1].getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(order[0], / quit$/i);
    await sees(order[2], /your turn!/i);
  });
  await session.step("the third player quits too: the first wins, and each phone gets its own ending", async () => {
    await order[2].getByRole("button", { name: "Quit game" }).click();
    await order[2].getByRole("button", { name: "QUIT", exact: true }).click();
    await sees(order[0], /you win!/i);
    await sees(order[1], /you're 3rd/i);
    await sees(order[2], /you're 2nd/i);
    await heard(order[0], "boardThump", "matchWinFanfare");
    await felt(order[0], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking with everyone's boxes", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
    await order[0].getByLabel("1 points").waitFor();
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /dots & boxes/i }).waitFor();
  });
}
