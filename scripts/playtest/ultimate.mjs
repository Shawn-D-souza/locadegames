// Ultimate Tic-tac-toe: two players, one match (the whole tournament): small boards won by each side, the big win,
// each phone's result, the results, back to the room.
import { felt, heard, sees } from "./session.mjs";

const board = (page) => page.getByRole("group", { name: "Board" });
/** Cells are the board's buttons, small board by small board (cell `board * 9 + place`). */
const cell = (page, index) => board(page).getByRole("button").nth(index);

/**
 * A short game the first player (X) wins on the diagonal: X takes the top-left board (move 5), O the left one
 * (move 12), X the middle (move 15) and the bottom-right (move 17). Each move waits until both phones show it.
 */
const X_WINS = [3, 27, 4, 36, 5, 45, 39, 31, 40, 44, 75, 35, 77, 48, 41, 49, 76];

async function playToWin(players) {
  for (const index of X_WINS) {
    const mover = await Promise.any(
      players.map(async (page) => {
        await cell(page, index).and(page.locator(":enabled")).waitFor({ timeout: 5_000 });
        return page;
      }),
    );
    await cell(mover, index).click();
    for (const page of players) await cell(page, index).and(page.locator(":disabled")).waitFor({ timeout: 5_000 });
  }
}

export default async function ultimate(session) {
  let players = [];
  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts Ultimate Tic-tac-toe; both see the board", async () => {
    await players[0].getByRole("button", { name: /ultimate/i }).click();
    for (const page of players) await board(page).waitFor();
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
  });
  await session.step("small boards are won on both sides, then the big one; each phone sees its result", async () => {
    await playToWin(players);
    const winner = await Promise.any(players.map(async (page) => (await sees(page, /you win!/i), page)));
    const loser = players.find((page) => page !== winner);
    await sees(loser, /you lost/i);
    await heard(winner, "ultimateMarkX", "ultimateMarkO", "ultimateYouClaimedBoard", "ultimateBoardClaimed", "boardThump", "winLineDrawnWithSparks", "matchWinFanfare");
    await heard(loser, "ultimateMarkX", "ultimateBoardClaimed", "ultimateMarkO", "ultimateYouClaimedBoard", "boardThump", "winLineDrawn", "matchLossSting");
    await felt(winner, "ultimateMarkPlaced", "ultimateOpponentMoved", "ultimateBoardClaimed", "thump", "winLine", "matchWon");
    await felt(loser, "ultimateOpponentMoved", "ultimateMarkPlaced", "ultimateBoardClaimed", "thump", "matchLost");
  });
  await session.step("the results come by themselves: a champion", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /territory/i }).waitFor();
  });
}
