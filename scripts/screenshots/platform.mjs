// The platform's screens, shared by every game: home, joining, errors, the room (every game's tile: shoot again after
// adding a game or changing a tile), settings, the tournament's screens (played with tic-tac-toe, the simplest), the
// results and the connection's troubles. Each game's own screens are in its own file.
import { sees, wait } from "../playtest/session.mjs";
import { board, playCells, roomCode, whoever } from "./camera.mjs";

export default async function platform(camera) {
  // Home, then a room link, joining (the server never answers), a room that doesn't exist, and servers full (faked).
  const home = await camera.player();
  await home.goto(camera.base);
  await home.getByRole("button", { name: /create room/i }).waitFor();
  await camera.shoot(home, "home");

  const joining = await camera.player();
  await joining.routeWebSocket(/\/api\/rooms\//, () => {});
  await joining.goto(camera.base + "?room=412345");
  await joining.getByRole("button", { name: /join room/i }).waitFor();
  await camera.shoot(joining, "home-with-code");
  await joining.getByRole("button", { name: /join room/i }).click();
  await sees(joining, /joining room/i);
  await camera.shoot(joining, "joining");

  const missing = await camera.player();
  await missing.goto(camera.base + "?room=412345");
  await missing.getByRole("button", { name: /join room/i }).click();
  await sees(missing, /oops/i);
  await camera.shoot(missing, "error");

  await home.route("**/api/rooms", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "SERVERS_FULL", resetAt: new Date(Date.now() + 5 * 3600e3).toISOString() }),
    }),
  );
  await home.getByRole("button", { name: /create room/i }).click();
  await sees(home, /servers full/i);
  await camera.shoot(home, "servers-full");

  // The room: alone, then full of friends suggesting a game (more voters than the tile shows: "+1"), host and guest.
  const [host] = await camera.room(1);
  await camera.shoot(host, "room-alone");
  const guests = [];
  for (let i = 0; i < 4; i++) {
    const guest = await camera.join(roomCode(host));
    await guest.getByRole("button", { name: /^tic/i }).click();
    guests.push(guest);
  }
  await host.getByText("+1").waitFor();
  await camera.shoot(host, "room-host");
  await camera.shoot(guests[0], "room-guest");
  await host.getByRole("button", { name: "Settings" }).click();
  await camera.shoot(host, "settings-popup", { screen: true });
  await host.getByRole("button", { name: "CLOSE" }).click();
  await host.getByRole("button", { name: /show qr/i }).click();
  await camera.shoot(host, "qr-popup", { screen: true });
  await host.getByRole("button", { name: "CLOSE" }).click();

  // A tournament of three: each socket goes through Playwright, so a message can be slipped in or the connection dropped.
  const sockets = new Map();
  let blocked = null;
  const tracked = async () => {
    const page = await camera.player();
    await page.routeWebSocket(/\/api\/rooms\//, (ws) => {
      if (blocked === page) return void ws.close({ code: 1011 });
      ws.connectToServer();
      sockets.set(page, ws);
    });
    return page;
  };
  const first = await tracked();
  await first.goto(camera.base);
  await first.getByRole("button", { name: /create room/i }).click();
  await first.waitForURL(/room=\d{6}/);
  const pages = [first];
  for (let i = 0; i < 2; i++) {
    const guest = await tracked();
    await guest.goto(`${camera.base}?room=${roomCode(first)}`);
    await guest.getByRole("button", { name: /join room/i }).click();
    await guest.getByRole("button", { name: /^tic/i }).waitFor();
    pages.push(guest);
  }
  await first.getByRole("button", { name: /^tic/i }).click();
  /** Round by round: who plays (the two on a board, once both show it) and who sits out. */
  const split = async () => {
    for (const started = Date.now(); Date.now() - started < 20_000; ) {
      const onBoard = await Promise.all(pages.map(async (page) => (await board(page).count()) > 0));
      if (onBoard.filter(Boolean).length === 2) return { playing: pages.filter((_, i) => onBoard[i]), bye: pages.find((_, i) => !onBoard[i]) };
      await wait(100);
    }
    throw new Error("the round's two players never both showed a board");
  };
  let { playing, bye } = await split();
  await playCells(playing, [4]);
  sockets.get(playing[0]).send(JSON.stringify({ type: "error", error: "NOT_YOUR_TURN" }));
  await wait(300);
  await camera.shoot(playing[0], "toast", { screen: true });
  await playing[0].getByRole("button", { name: "Quit match" }).click();
  await camera.shoot(playing[0], "quit-popup", { screen: true });
  await playing[0].getByRole("button", { name: "KEEP PLAYING" }).click();
  await camera.shoot(bye, "points");
  await bye.getByRole("button", { name: /^Watch/ }).first().click();
  await sees(bye, /watching live/i);
  await camera.shoot(bye, "watching");
  await bye.getByRole("button", { name: "BACK TO SCORES", exact: true }).click();
  await bye.getByRole("button", { name: /leave room|back/i }).first().click();
  await camera.shoot(bye, "leave-popup", { screen: true });
  await bye.getByRole("button", { name: "STAY" }).click();

  // The centre's player wins down the middle; round 2's intro on a player's phone and the one who sits out.
  await playCells(playing, [0, 1, 3, 7]);
  // The intro shows only for the last few seconds of the break, so both phones are photographed at once.
  await Promise.all(pages.map((page) => page.getByRole("timer", { name: /starts in/i }).waitFor({ timeout: 15_000 })));
  const sitting = await whoever(pages, (page) => page.getByText(/sit this round out/i), 1_000);
  await Promise.all([camera.shoot(pages.find((page) => page !== sitting), "round-intro"), camera.shoot(sitting, "round-intro-sitting-out")]);
  ({ playing } = await split());
  await playCells(playing, [0, 3, 1, 4, 2]);
  for (const page of pages) await sees(page, /champion/i, 15_000);
  await wait(1_500);
  await camera.shoot(first, "results-host");
  await camera.shoot(pages[1], "results-guest");

  // The host's connection drops: reconnecting, then (after every retry) lost.
  blocked = first;
  sockets.get(first).close({ code: 1011 });
  await sees(first, /reconnecting/i);
  await camera.shoot(first, "reconnecting", { screen: true });
  await sees(first, /connection lost/i, 25_000);
  await camera.shoot(first, "connection-lost", { screen: true });
}
