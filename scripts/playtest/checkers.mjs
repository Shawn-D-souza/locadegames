// Checkers: two players, one match (the whole tournament), a short game played out move by move to a win: taps and a
// drag move pieces, a piece that can't move while a capture is forced is refused, chains of jumps go a hop at a time,
// a man is crowned, each phone's result, the results, back to the room.
import { felt, heard, sees } from "./session.mjs";

/**
 * A short game (found by a search with the game's own rules): each move is the start square and every square it lands
 * on (square = row × 8 + column, from the top-left). The first player (who moves first) wins on the 21st move; on the
 * way are four chains of jumps and a man crowned on the far row.
 */
export const GAME = [
  [46, 37], [19, 28], [37, 19], [12, 26], [42, 33], [5, 12], [33, 19, 5], [23, 30], [5, 23, 37], [3, 12], [44, 35],
  [17, 26], [35, 17, 3], [21, 30], [37, 23], [7, 14], [23, 5, 19], [1, 10], [3, 17], [8, 26], [19, 33],
];
/** Played by a drag rather than taps: the second player's first move. */
const DRAGGED = 1;

const where = (square) => `row ${Math.floor(square / 8) + 1}, column ${(square % 8) + 1}`;
const Where = (square) => `Row ${Math.floor(square / 8) + 1}, column ${(square % 8) + 1}`;
const pickUp = (page, square) => page.getByRole("button", { name: new RegExp(`^Pick up .+ on ${where(square)}$`) });
const moveTo = (page, square) => page.getByRole("button", { name: `Move to ${where(square)}`, exact: true });
const pieceOn = (page, square) => page.getByRole("img", { name: new RegExp(`^${Where(square)}: .+'s (piece|king)$`) });
const anyPickUp = (page) => page.getByRole("button", { name: /^Pick up / }).first();

/** Whoever may move now (their buttons show only on their turn). */
const mover = (players) => Promise.any(players.map(async (page) => (await anyPickUp(page).waitFor({ timeout: 5_000 }), page)));

async function center(locator) {
  await locator.waitFor({ timeout: 5_000 });
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export default async function checkers(session) {
  let players = [];
  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts Checkers; both see the board", async () => {
    await players[0].getByRole("button", { name: /^checkers/i }).click();
    for (const page of players) await page.getByRole("group", { name: "Board" }).waitFor();
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
  });

  let first;
  let second;
  /** Plays move `n` of the game on whoever's phone it is, and waits until both phones show the piece where it ended. */
  const play = async (n) => {
    const [from, ...path] = GAME[n];
    const page = n % 2 === 0 ? first : second;
    if (n === DRAGGED) {
      const start = await center(pickUp(page, from));
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      // The squares it can go to show once it's picked up.
      const end = await center(moveTo(page, path[0]));
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await page.mouse.up();
    } else {
      await pickUp(page, from).click();
      for (const square of path) await moveTo(page, square).click();
    }
    for (const p of players) await pieceOn(p, path.at(-1)).waitFor({ timeout: 5_000 });
  };

  await session.step("a tap picks a piece up and a tap puts it down; a drag moves one too", async () => {
    first = await mover(players);
    second = players.find((page) => page !== first);
    await play(0);
    await play(1);
    await felt(first, "checkersPicked", "checkersYourStep", "checkersOpponentMoved");
    await felt(second, "checkersOpponentMoved", "checkersPicked", "checkersYourStep");
    await heard(first, "checkersStep", "checkersStep");
  });
  await session.step("a capture must be taken: another piece won't pick up, the capture plays", async () => {
    // Only the piece that can jump has a button; a tap on another of yours is a small no.
    if ((await pickUp(first, 40).count()) > 0) throw new Error("a piece that can't capture could be picked up");
    await first.mouse.click(...Object.values(await center(pieceOn(first, 40))));
    await felt(first, "refused");
    await play(2);
    await heard(second, "checkersCapture");
    await felt(second, "checkersOpponentJumped");
  });
  await session.step("chains of jumps go a hop at a time; a man reaching the far row is crowned", async () => {
    for (let n = 3; n <= 6; n++) await play(n);
    // The man that jumped twice to the far row (square 5) is a king now.
    await first.getByRole("img", { name: new RegExp(`^${Where(5)}: .+'s king$`) }).waitFor();
    await heard(first, "checkersCapture", "checkersCapture", "checkersCrowned");
    await felt(first, "checkersYourJump", "checkersCrowned");
  });
  await session.step("the first player takes the last piece that can move and wins; each phone sees its own", async () => {
    for (let n = 7; n < GAME.length; n++) await play(n);
    await sees(first, /you win!/i);
    await sees(second, /you lost/i);
    await heard(first, "boardThump", "matchWinFanfare");
    await heard(second, "checkersCapture", "boardThump", "matchLossSting");
    await felt(first, "thump", "matchWon");
    await felt(second, "thump", "matchLost");
  });
  await session.step("the results come by themselves: a champion", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /territory/i }).waitFor();
  });
}

