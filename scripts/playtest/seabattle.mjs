// Sea Battle: two players, one match (the whole tournament): both place their fleets at once (one shuffles and waits
// for the other, who drags every ship out of the dock and turns one onto another and back), then they fire until a fleet
// is gone (the first misses once, then sinks the fleet it watched being placed); each phone's result, the results, back to the room.
// Heard and felt along the way: placing (picked up, put down, turned, the shuffle), the cannons coming in and firing,
// the splashes and blasts, your turn, and each phone's ending.
import { felt, heard, sees } from "./session.mjs";

/** The waters you fire at (your own are "Your fleet", placing and firing). */
const target = (page) => page.getByRole("group", { name: /^(?!your).*waters$/i });
const ENDING = /you win!|you lost/i;

/** The middle of cell `name` ("C1") of your own waters while placing. */
async function cellCenter(page, name) {
  const box = await page.getByRole("group", { name: "Your fleet" }).getByRole("button", { name, exact: true }).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags the first ship of `length` still in the dock, by its first cell, onto cell `name`. */
export async function dock(page, length, name) {
  const ship = page.getByRole("button", { name: `Ship of ${length}: drag onto the board` }).first();
  const box = await ship.boundingBox();
  await page.mouse.move(box.x + box.width / length / 2, box.y + box.height / 2);
  await page.mouse.down();
  const to = await cellCenter(page, name);
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** Taps cell `name` of your own waters (a ship lying there turns around it). */
async function tap(page, name) {
  const at = await cellCenter(page, name);
  await page.mouse.click(at.x, at.y);
}

/**
 * The second player's fleet as the placing step leaves it: the 5 across from C1, then the 4, 3, 3 and 2 from A2–A5.
 * Firing at these instead of every cell keeps the match (and the playtest) short.
 */
const PLACED_FLEET = ["C1", "D1", "E1", "F1", "G1", "A2", "B2", "C2", "D2", "A3", "B3", "C3", "A4", "B4", "C4", "A5", "B5"];
/** Clear water on that board: the first player fires here once, so the turn passes and both get one (and a splash). */
const PLACED_MISS = "H8";

/**
 * Whoever's turn it is fires until the match ends: the first player misses once on purpose, then sinks the fleet it
 * knows; the second, who can't know the shuffled fleet, fires at the first cell it still may.
 */
async function fireUntilOver(players) {
  const aims = [PLACED_MISS, ...PLACED_FLEET];
  for (let shot = 0; shot < 128; shot++) {
    for (const page of players) if (await page.getByText(ENDING).isVisible()) return;
    const mover = await Promise.any(
      players.map(async (page) => {
        await target(page).getByRole("button").and(page.locator(":enabled")).first().waitFor({ timeout: 5_000 });
        return page;
      }),
    ).catch(() => null);
    if (!mover) continue; // the last shot just ended it: the endings are coming
    const cell =
      mover === players[0] && aims.length
        ? target(mover).getByRole("button", { name: aims.shift(), exact: true })
        : target(mover).getByRole("button").and(mover.locator(":enabled")).first();
    const name = await cell.getAttribute("aria-label");
    await cell.click();
    // The shot is in once its mark shows on both phones ("C3, miss"): on the shooter's target, on the other's own fleet
    // (each as its cannonball lands there).
    const shown = new RegExp(`^${name},`);
    await target(mover).getByRole("button", { name: shown }).waitFor({ timeout: 5_000 });
    const other = players.find((page) => page !== mover);
    await other.getByRole("group", { name: "Your fleet" }).getByRole("button", { name: shown }).waitFor({ timeout: 5_000 });
  }
  throw new Error("the match never ended");
}

export default async function seabattle(session) {
  let players = [];
  await session.step("2 players in a room", async () => {
    players = await session.room(2);
  });
  await session.step("the host starts Sea Battle; both place their ships", async () => {
    await players[0].getByRole("button", { name: /^sea battle/i }).click();
    for (const page of players) await sees(page, /place your ships!/i);
  });
  await session.step("one shuffles, gets ready and waits; the other drags every ship on, turns one onto another and back, gets ready; the shooting starts", async () => {
    await players[0].getByRole("button", { name: "SHUFFLE", exact: true }).click();
    await players[0].getByRole("button", { name: "READY!", exact: true }).click();
    await sees(players[0], /waiting for/i);
    // The other starts with an empty board: every ship is dragged out of the dock, one to a row.
    const ready = players[1].getByRole("button", { name: "READY!", exact: true });
    if (await ready.isEnabled()) throw new Error("READY! is on before any ship is placed");
    for (const [length, name] of [[5, "A1"], [4, "A2"], [3, "A3"], [3, "A4"], [2, "A5"]]) await dock(players[1], length, name);
    // The 5, turned around its third cell (C1), runs down over the others: it turns anyway, and READY! waits.
    await tap(players[1], "C1");
    await sees(players[1], /ships can't overlap!/i);
    if (await ready.isEnabled()) throw new Error("READY! is on with ships overlapping");
    // Turned back around C1 (now its first cell), it lies along row 1 from C1: clear.
    await tap(players[1], "C1");
    await players[1].getByRole("button", { name: /^ship of 5 at C1, across/i }).waitFor();
    await ready.click();
    for (const page of players) await target(page).waitFor();
    await Promise.any(players.map((page) => sees(page, /hold to aim, let go to fire!/i)));
    await heard(players[0], "seaBattleShuffle");
    await heard(players[1], "seaBattleShipPickedUp", "seaBattleShipPlaced", "seaBattleShipTurned");
    await felt(players[1], "seaBattleShipPickedUp", "seaBattleShipPlaced", "seaBattleShipTurned");
  });
  await session.step("they fire until a fleet is gone; each phone sees its own result", async () => {
    await fireUntilOver(players);
    const results = await Promise.all(players.map(async (page) => (await page.getByText(ENDING).first().textContent())?.toUpperCase()));
    // There are no draws: whoever sinks the whole fleet first wins at once.
    if (!(results.includes("YOU WIN!") && results.includes("YOU LOST"))) throw new Error(`endings don't match: ${results.join(" / ")}`);
    // Both players missed at some point (the first on purpose): the turn came round to each of them.
    for (const page of players) {
      await heard(page, "seaBattleCannonReady", "seaBattleCannonFire", "seaBattleSplash", "boardThump");
      await felt(page, "seaBattleYourTurn", "seaBattleFire", "thump");
    }
    const winner = players[results.indexOf("YOU WIN!")];
    const loser = players[results.indexOf("YOU LOST")];
    await heard(winner, "seaBattleYouHit", "matchWinFanfare");
    // The shot that ends the match plays out on both phones before the ending: its boom, then its landing as the ending starts.
    for (const page of players) {
      const log = await page.evaluate(() => window.soundLog ?? []);
      const thump = log.lastIndexOf("boardThump");
      // Before the ending's landing, the last thing that happened was that shot's boom (aiming clicks and the cannon coming in aside).
      const before = log.slice(0, thump - 1).filter((sound) => sound !== "seaBattleAim" && sound !== "seaBattleCannonReady");
      if (log[thump - 1] !== "seaBattleHit" || before.at(-1) !== "seaBattleCannonFire") throw new Error(`the last shot didn't play out before the ending; heard: ${log.slice(-6).join(", ")}`);
    }
    // A sinking has no sound of its own (it plays the hit's) but its own feel: the winner sank every ship of the loser's.
    await felt(winner, "seaBattleYouSank");
    await felt(loser, "seaBattleYourShipSank");
  });
  await session.step("the results come by themselves: a champion", async () => {
    for (const page of players) await sees(page, /champion!/i, 15_000);
  });
  await session.step("the host takes everyone back to the room", async () => {
    await players[0].getByRole("button", { name: "BACK TO ROOM", exact: true }).click();
    for (const page of players) await page.getByRole("button", { name: /^sea battle/i }).waitFor();
  });
}
