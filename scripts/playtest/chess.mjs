// Chess: two players, one match (the whole tournament), a short game played out move by move to checkmate: both
// clocks on the cards, taps and a drag move pieces, a piece that can't move is refused, captures, a pawn promoted
// (the picker), castling (the rook comes along), checkmate with each phone's result and why, the results, back to the room.
import { felt, heard, sees, wait } from "./session.mjs";

/**
 * A short game (checked with the game's own rules): each move is the square a piece leaves and the one it goes to,
 * by their chess names (the first player, who moves first, plays up from rank 1 like White). On the way: captures, a
 * pawn promoted to a queen (move 8), castling (move 16); the first player mates on the 21st move.
 */
export const GAME = [
  ["h2", "h4"], ["g7", "g5"], ["h4", "g5"], ["h7", "h6"], ["g5", "h6"], ["g8", "f6"], ["h6", "h7"], ["h8", "g8"],
  ["h7", "h8", "queen"], ["a7", "a6"], ["e2", "e4"], ["a6", "a5"], ["f1", "c4"], ["a5", "a4"], ["g1", "f3"], ["b7", "b6"],
  ["e1", "g1"], ["b6", "b5"], ["h8", "g8"], ["b5", "b4"], ["g8", "f7"],
];
export const PROMOTION = 8;
export const CASTLING = 16;
/** Played by a drag rather than taps: the second player's first move. */
const DRAGGED = 1;

export const pickUp = (page, square) => page.getByRole("button", { name: new RegExp(`^Pick up .+ on ${square}$`) });
export const moveTo = (page, square) => page.getByRole("button", { name: `Move to ${square}`, exact: true });
export const pieceOn = (page, square, kind = "\\w+") => page.getByRole("img", { name: new RegExp(`^${square}: .+'s ${kind}$`) });
const anyPickUp = (page) => page.getByRole("button", { name: /^Pick up / }).first();

/** Whoever may move now (their buttons show only on their turn). */
export const mover = (players) => Promise.any(players.map(async (page) => (await anyPickUp(page).waitFor({ timeout: 5_000 }), page)));

async function center(locator) {
  await locator.waitFor({ timeout: 5_000 });
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Plays move `n` of the game on whoever's phone it is (taps, or a drag), and waits until both phones have played it out. */
export async function playMove(first, second, n, { drag = false } = {}) {
  const [from, to, promotion] = GAME[n];
  const page = n % 2 === 0 ? first : second;
  // "h2: Ana's pawn": whose piece it is, and what (a promoted pawn arrives as its new piece).
  const [, piece] = (await pieceOn(page, from).getAttribute("aria-label")).split(": ");
  const arrives = promotion ? piece.replace(/\w+$/, promotion) : piece;
  if (drag) {
    const start = await center(pickUp(page, from));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // The squares it can go to show once it's picked up.
    const end = await center(moveTo(page, to));
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
  } else {
    await pickUp(page, from).click();
    await moveTo(page, to).click();
  }
  if (promotion) await page.getByRole("button", { name: `Promote to ${promotion}`, exact: true }).click();
  // Once it has played out on both phones (meanwhile the piece it takes still shows there).
  for (const p of [first, second]) await p.getByRole("img", { name: `${to}: ${arrives}`, exact: true }).waitFor({ timeout: 5_000 });
}

export default async function chess(session) {
  let players = [];
  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts Chess; both see the board and both clocks at 10:00", async () => {
    await players[0].getByRole("button", { name: /^chess/i }).click();
    for (const page of players) await page.getByRole("group", { name: "Board" }).waitFor();
    await heard(players[0], "roomEntered", "playerJoined", "cardPress", "gameStarting");
    for (const page of players) {
      const clocks = page.getByRole("timer");
      if ((await clocks.count()) !== 2) throw new Error("expected a clock on each card");
      await page.getByRole("timer", { name: "10:00 left" }).first().waitFor();
    }
  });

  let first;
  let second;
  const play = (n) => playMove(first, second, n, { drag: n === DRAGGED });

  await session.step("a piece that can't move is a small no; a tap picks a piece up and a tap puts it down; a drag moves one too", async () => {
    first = await mover(players);
    second = players.find((page) => page !== first);
    // The rook in the corner is shut in by its own pieces.
    if ((await pickUp(first, "a1").count()) > 0) throw new Error("a piece that can't move could be picked up");
    await first.mouse.click(...Object.values(await center(pieceOn(first, "a1"))));
    await felt(first, "refused");
    // A single pulse never cuts a running pattern: let the no finish before picking up.
    await wait(300);
    await play(0);
    await play(1);
    await felt(first, "chessPicked", "chessYourMove", "chessOpponentMoved");
    await felt(second, "chessOpponentMoved", "chessPicked", "chessYourMove");
    await heard(first, "chessMove", "chessMove");
  });
  await session.step("a capture takes the piece", async () => {
    await play(2);
    await heard(second, "chessCapture");
    await felt(second, "chessOpponentCaptured");
  });
  await session.step("a pawn on the far row asks what it becomes, and becomes a queen", async () => {
    for (let n = 3; n <= PROMOTION; n++) await play(n);
    await heard(first, "chessPromote");
    await felt(first, "chessPromoted");
  });
  await session.step("the king castles and the rook comes along", async () => {
    for (let n = PROMOTION + 1; n <= CASTLING; n++) await play(n);
    for (const page of players) await pieceOn(page, "f1", "rook").waitFor();
    await heard(first, "chessCastle");
  });
  await session.step("the first player mates; each phone sees its own result and why", async () => {
    for (let n = CASTLING + 1; n < GAME.length; n++) await play(n);
    await sees(first, /you win!/i);
    await sees(second, /you lost/i);
    for (const page of players) await sees(page, /checkmate/i);
    await heard(first, "chessCapture", "chessCheck", "boardThump", "matchWinFanfare");
    await heard(second, "chessCapture", "chessCheck", "boardThump", "matchLossSting");
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
