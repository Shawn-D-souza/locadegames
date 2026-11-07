// Tic-tac-toe: two players, one match (the whole tournament), the result on both phones, the results, back to the room.
import { felt, heard, sees } from "./session.mjs";

const board = (page) => page.getByRole("group", { name: "Board" });

/** Whoever moves first takes the top row; the other plays the middle row's first two cells. Each move waits until both phones show it. */
async function playToWin(players) {
  for (const cell of [0, 3, 1, 4, 2]) {
    const mover = await Promise.any(
      players.map(async (page) => {
        await board(page).getByRole("button").nth(cell).and(page.locator(":enabled")).waitFor({ timeout: 5_000 });
        return page;
      }),
    );
    await board(mover).getByRole("button").nth(cell).click();
    for (const page of players) await board(page).getByRole("button").nth(cell).and(page.locator(":disabled")).waitFor({ timeout: 5_000 });
  }
}

export default async function tictactoe(session) {
  let players = [];
  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts tic-tac-toe; both see the board", async () => {
    await players[0].getByRole("button", { name: /tic/i }).click();
    for (const page of players) await board(page).waitFor();
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
    await felt(players[0], "smallNews", "smallPress", "gameStarting");
  });
  await session.step("a match to a win; the winner and the loser each see theirs", async () => {
    await playToWin(players);
    const winner = await Promise.any(players.map(async (page) => (await sees(page, /you win!/i), page)));
    const loser = players.find((page) => page !== winner);
    await sees(loser, /you lost/i);
    await heard(winner, "ticTacToeMarkX", "ticTacToeMarkO", "ticTacToeMarkX", "boardThump", "winLineDrawnWithSparks", "matchWinFanfare");
    await heard(loser, "ticTacToeMarkO", "boardThump", "winLineDrawn", "matchLossSting");
    await felt(winner, "ticTacToeMarkPlaced", "ticTacToeOpponentMoved", "ticTacToeMarkPlaced", "thump", "winLine", "matchWon");
    await felt(loser, "ticTacToeOpponentMoved", "ticTacToeMarkPlaced", "thump", "matchLost");
  });
  await session.step("the results come by themselves: a champion", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /territory/i }).waitFor();
  });
}
