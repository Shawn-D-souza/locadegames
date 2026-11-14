// Ludo: three players on the classic board (arms 0, 1, 2), with loaded dice (the dev server lets playtests choose them,
// so every moment comes at once): a roll that moves nothing, a 6 letting the roller pick which pawn comes out and
// rolling again, the only pawn that can move moving by itself, picking which pawn to move, a capture sending a pawn home (felt by both), three 6s ending a turn, quits ending the game, each phone's
// ending, the results, back to the room. Progress and squares follow `src/shared/games/ludo/board.ts`.
import { felt, heard, sees } from "./session.mjs";
import { roll, seatOf } from "./snakesladders.mjs";

/** Waits until `page` may move pawn `pawn` (0–3), taps it, and waits until the move has gone. */
export async function pick(page, pawn) {
  const button = page.getByRole("button", { name: `Move pawn ${pawn + 1}`, exact: true });
  await button.waitFor({ timeout: 10_000 });
  await button.click();
  await button.waitFor({ state: "detached", timeout: 5_000 });
}

/** Waits until `page`'s board (as it tells screen readers: "Ana: 3 in base, 0 home, on 4; …") says this about `who`. */
async function boardSays(page, who, text) {
  await page.getByRole("img", { name: new RegExp(`${who}: ${text}(;|$)`) }).waitFor({ timeout: 8_000 });
}

export default async function ludo(session) {
  let players = [];
  /** In turn order. */
  let order = [];
  let names = [];
  await session.step("3 players in a room", async () => {
    players = await session.room(3);
  });
  await session.step("the host starts Ludo; everyone sees the board, and only the first in turn order may roll", async () => {
    await players[0].getByRole("button", { name: /^ludo/i }).click();
    for (const page of players) await page.getByRole("list", { name: "Turn order" }).waitFor();
    order = [];
    for (const page of players) order[await seatOf(page)] = page;
    if (order.filter(Boolean).length !== 3) throw new Error("couldn't read the turn order from the players' row");
    names = await order[0].getByRole("list", { name: "Turn order" }).getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label").split(/ \(you\)|,/)[0]));
    await order[0].getByRole("button", { name: /^roll/i }).waitFor();
    if (await order[1].getByRole("button", { name: /^roll/i }).count()) throw new Error("the second player may roll on the first player's turn");
    await heard(players[0], "gameStarting");
  });
  await session.step("a 3 with every pawn in the base moves nothing, and the turn passes", async () => {
    await roll(order[0], 3);
    await sees(order[0], /no pawn can move/i);
    await order[1].getByRole("button", { name: /^roll/i }).waitFor();
    await heard(order[0], "dieRoll", "ludoNoMove");
  });
  await session.step("a 6: the roller picks which pawn comes out, and rolls again; the only pawn out moves by itself", async () => {
    await roll(order[1], 6);
    await sees(order[1], /move a pawn!/i);
    await pick(order[1], 0);
    await sees(order[1], /roll again!/i);
    await roll(order[1], 4); // onto square 25
    for (const page of players) await boardSays(page, names[1], "3 in base, 0 home, on 4");
    await heard(order[1], "dieSix", "ludoEnter", "ludoHop");
    await felt(order[1], "dieLands", "dieSix", "ludoEnter");
    await roll(order[2], 6);
    await pick(order[2], 0);
    await roll(order[2], 2);
  });
  await session.step("a 6 with a pawn out: the roller picks, and the others wait while they do", async () => {
    await roll(order[0], 6);
    await pick(order[0], 0); // out, on square 8
    await roll(order[0], 6);
    await sees(order[0], /move a pawn!/i);
    await sees(order[1], /is moving/i);
    await pick(order[0], 0); // 0 → 6
    await roll(order[0], 5); // 6 → 11, the only pawn that can move
    await roll(order[1], 1); // 4 → 5: square 26
    await roll(order[2], 1);
    await boardSays(order[1], names[0], "3 in base, 0 home, on 11");
  });
  await session.step("landing on another player's pawn sends it back to its base (felt by both) and rolls again", async () => {
    await roll(order[0], 6);
    await pick(order[0], 0); // 11 → 17: square 25
    await roll(order[0], 1); // 17 → 18: square 26, the second player's pawn
    for (const page of players) await boardSays(page, names[1], "4 in base, 0 home");
    await sees(order[0], /you captured/i);
    await sees(order[1], /captured you!/i);
    await heard(order[0], "ludoCapture");
    await felt(order[0], "ludoCapture");
    await felt(order[1], "ludoCaptured");
    await roll(order[0], 3);
  });
  await session.step("the third 6 in a row ends the turn unplayed", async () => {
    await roll(order[1], 6);
    await pick(order[1], 0);
    await roll(order[1], 6);
    await pick(order[1], 0);
    await roll(order[1], 6);
    await sees(order[1], /three 6s! turn over/i);
    await order[2].getByRole("button", { name: /^roll/i }).waitFor();
    await heard(order[1], "ludoThreeSixes");
    await felt(order[1], "ludoThreeSixes");
  });
  await session.step("two players quit: only one is left racing, so the game ends; each phone gets its ending", async () => {
    for (const page of [order[2], order[1]]) {
      await page.getByRole("button", { name: "Quit game" }).click();
      await page.getByRole("button", { name: "QUIT", exact: true }).click();
    }
    await sees(order[0], /you win!/i);
    await heard(order[0], "boardThump", "matchWinFanfare");
    await felt(order[0], "thump", "matchWon");
  });
  await session.step("the results come by themselves: a champion and the ranking", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
    await sees(players[0], /ranking/i);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /^ludo/i }).waitFor();
  });
}
