// 4 in a Row: two players, one match (the whole tournament): taps and drags drop discs, a drag slid off the board drops
// nothing, the first player wins along the bottom, each phone's result, the results, back to the room.
import { felt, heard, sees } from "./session.mjs";

const ROWS = 6;
const column = (page, c) => page.getByRole("button", { name: `Drop in column ${c + 1}`, exact: true });
/** A hole's disc, by row from the top and column (both from 0). */
const disc = (page, row, c) => page.getByRole("img", { name: new RegExp(`^Row ${row + 1}, column ${c + 1}: .+'s disc$`) });

/** Whoever may drop now (their column buttons show only on their turn). */
const mover = (players) => Promise.any(players.map(async (page) => (await column(page, 0).waitFor({ timeout: 5_000 }), page)));

/** The middle of column `c`'s button: on the aiming row, over the holes. */
async function columnCenter(page, c) {
  const box = await column(page, c).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses on column `from`, slides along to `to` and lets go there (a mouse moves the same way a finger does). */
async function drag(page, from, to) {
  const start = await columnCenter(page, from);
  const end = await columnCenter(page, to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

export default async function fourinarow(session) {
  let players = [];
  const heights = Array(7).fill(0);
  /** Drops in column `c` (by tap, or by a drag from `dragFrom`) and waits until both phones show the disc. */
  const drop = async (page, c, dragFrom = null) => {
    if (dragFrom === null) await column(page, c).click();
    else await drag(page, dragFrom, c);
    const row = ROWS - 1 - heights[c]++;
    for (const p of players) await disc(p, row, c).waitFor({ timeout: 5_000 });
  };

  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts 4 in a Row; both see the board", async () => {
    await players[0].getByRole("button", { name: /^4 in a row/i }).click();
    for (const page of players) await page.getByRole("group", { name: "Board" }).waitFor();
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
  });

  let first;
  let second;
  await session.step("a tap drops a disc to the bottom; a drag drops it where the finger lets go", async () => {
    first = await mover(players);
    second = players.find((page) => page !== first);
    await drop(first, 0);
    await drop(second, 0);
    // Pressed on column 6, slid along to column 2: it drops in column 2.
    await drop(first, 1, 5);
    await felt(first, "fourInARowDiscDropped", "fourInARowYourDiscLanded", "fourInARowOpponentLanded", "fourInARowAimMoved", "fourInARowDiscDropped");
  });
  await session.step("a drag slid off the board drops nothing: still your turn", async () => {
    const start = await columnCenter(second, 6);
    await second.mouse.move(start.x, start.y);
    await second.mouse.down();
    await second.mouse.move(start.x, 4, { steps: 8 });
    await second.mouse.up();
    await second.waitForTimeout(600);
    if ((await disc(second, ROWS - 1, 6).count()) > 0) throw new Error("a drag let go off the board dropped a disc");
    await column(second, 0).waitFor({ timeout: 1_000 });
  });
  await session.step("four along the bottom wins; the winner and the loser each see theirs", async () => {
    await drop(second, 1);
    await drop(first, 2);
    await drop(second, 2);
    await drop(first, 3);
    await sees(first, /you win!/i);
    await sees(second, /you lost/i);
    // Each phone hears its own discs as the ringed ones.
    await heard(first, "fourInARowRingedDiscLands", "fourInARowDiscLands", "fourInARowRingedDiscLands", "boardThump", "winLineDrawnWithSparks", "matchWinFanfare");
    await heard(second, "fourInARowDiscLands", "fourInARowRingedDiscLands", "boardThump", "winLineDrawn", "matchLossSting");
    await felt(first, "fourInARowYourDiscLanded", "thump", "winLine", "matchWon");
    await felt(second, "fourInARowOpponentLanded", "fourInARowDiscDropped", "fourInARowYourDiscLanded", "thump", "matchLost");
  });
  await session.step("the results come by themselves: a champion", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /territory/i }).waitFor();
  });
}
