// 4 in a Row's own screens: a game under way on the phone whose turn it is, aiming a disc (held over a column, its
// ghost in the hole it would fill), and the winner's ending on its board. The tournament around it is the platform's.
import { board, whoever } from "./camera.mjs";

const column = (page, c) => page.getByRole("button", { name: `Drop in column ${c + 1}`, exact: true });

/** Drops discs in these columns, each by whoever's turn it is, waiting until every phone shows it. */
async function dropAll(pages, columns) {
  for (const c of columns) {
    const mover = await whoever(pages, (page) => column(page, 0));
    const before = await board(mover).getByRole("img", { name: /disc$/ }).count();
    await column(mover, c).click();
    for (const page of pages) await board(page).getByRole("img", { name: /disc$/ }).nth(before).waitFor({ timeout: 5_000 });
  }
}

export default async function fourinarow(camera) {
  const players = await camera.room(2);
  await players[0].getByRole("button", { name: /^4 in a row/i }).click();
  for (const page of players) await board(page).waitFor();
  // The first player has columns 3, 4 and 5 along the bottom, the second the same row above: the first to move again.
  await dropAll(players, [2, 2, 3, 3, 4, 4]);
  const first = await whoever(players, (page) => column(page, 0));
  // A mouse left over the board keeps a disc hovering there; off the board, nothing is aimed.
  await first.mouse.move(0, 0);
  await first.waitForTimeout(500);
  await camera.shoot(first, "match");

  // Held down over column 6: the disc waits above it and its ghost shows where it would land.
  const box = await column(first, 5).boundingBox();
  await first.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await first.mouse.down();
  await camera.shoot(first, "aiming");
  // Letting go there drops the fourth along the bottom: the win, shot once its board has filled (before it moves on by itself).
  await first.mouse.up();
  await first.getByText(/you win!/i).waitFor({ timeout: 5_000 });
  await first.waitForTimeout(1_200);
  await camera.shoot(first, "ending-win");
}
