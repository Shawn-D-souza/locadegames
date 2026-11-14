// Sea Battle's own screens: placing the fleet (and ready, waiting for the other), mid-match on both phones (whose turn
// and the other's: misses, hits and a sunk ship on the board being fired at), and each phone's ending.
// Its results are the tournament's (the platform's).
import { dock } from "../playtest/seabattle.mjs";
import { wait } from "../playtest/session.mjs";
import { whoever } from "./camera.mjs";

/** The waters you fire at (your own are "Your fleet"). */
const target = (page) => page.getByRole("group", { name: /^(?!your).*waters$/i });
const fireable = (page) => target(page).getByRole("button").and(page.locator(":enabled"));
const ENDING = /you win!|you lost/i;
/** The guest drags each ship to the start of a row (the 5 along row 1, the 4 along row 2, ...), so the host knows where. */
const GUEST_FLEET = [[5, "A1"], [4, "A2"], [3, "A3"], [3, "A4"], [2, "A5"]];
/** The host's shots: a miss, two hits and a miss, the 5 sunk and a miss (the photos), then the rest of the fleet. */
const HOST_AIMS = ["H8", "A1", "B1", "F6", "C1", "D1", "E1", "G3"];
const HOST_FINISH = ["A2", "B2", "C2", "D2", "A3", "B3", "C3", "A4", "B4", "C4", "A5", "B5"];

/** Fires `cell` from `mover`'s phone and waits until the shot has landed on both phones. */
async function fire(players, mover, cell) {
  const name = await cell.getAttribute("aria-label");
  await cell.click();
  const shown = new RegExp(`^${name},`);
  await target(mover).getByRole("button", { name: shown }).waitFor({ timeout: 8_000 });
  const other = players.find((page) => page !== mover);
  await other.getByRole("group", { name: "Your fleet" }).getByRole("button", { name: shown }).waitFor({ timeout: 8_000 });
}

export default async function seabattle(camera) {
  const players = await camera.room(2);
  const [host, guest] = players;
  await host.getByRole("button", { name: /^sea battle/i }).click();
  await host.getByRole("button", { name: "READY!", exact: true }).waitFor();
  await wait(500);
  await camera.shoot(host, "placing");
  await host.getByRole("button", { name: "SHUFFLE", exact: true }).click();
  await host.getByRole("button", { name: "READY!", exact: true }).click();
  await wait(500);
  await camera.shoot(host, "waiting");
  for (const [length, cell] of GUEST_FLEET) await dock(guest, length, cell);
  await guest.getByRole("button", { name: "READY!", exact: true }).click();

  // Whoever's turn it is fires: the host its aims, the guest (who can't know the shuffled fleet) spread over the board.
  const aims = [...HOST_AIMS, ...HOST_FINISH];
  let pictured = false;
  for (let shot = 0; !(await host.getByText(ENDING).isVisible()); shot++) {
    if (shot > 100) throw new Error("the match never ended");
    const mover = await whoever(players, (page) => fireable(page).first(), 8_000).catch(() => null);
    if (!mover) continue; // the last shot just ended it: the endings are coming
    if (mover === host && !pictured && aims.length === HOST_FINISH.length) {
      // The boards have traded places by now; give the shooter's cannon its moment to come in.
      await wait(1_500);
      await camera.shoot(host, "your-turn");
      await camera.shoot(guest, "their-turn");
      pictured = true;
    }
    const cells = fireable(mover);
    const cell = mover === host ? target(host).getByRole("button", { name: aims.shift(), exact: true }) : cells.nth((shot * 7) % (await cells.count()));
    await fire(players, mover, cell);
  }
  await guest.getByText(ENDING).waitFor();
  await wait(1_500);
  const hostWon = (await host.getByText(/you win!/i).count()) > 0;
  await camera.shoot(hostWon ? host : guest, "won");
  await camera.shoot(hostWon ? guest : host, "lost");
}
