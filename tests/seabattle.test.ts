import { describe, expect, it } from "vitest";
import { CELL_COUNT, FLEET_SIZE, SEABATTLE_CONFIG } from "../src/shared/games/seabattle/config";
import { completeFleet, fitsAt, isValidFleet, randomFleet, shipCells, shipLength } from "../src/shared/games/seabattle/fleet";
import { applyMove, autoShot, createGame, expire, isGameOver, parseMove, seatsToMove, viewFor } from "../src/shared/games/seabattle/rules";
import { MARK, type Fleet, type SeaBattleState } from "../src/shared/games/seabattle/types";
import type { Seat } from "../src/shared/games/types";
import { seededRandom } from "../src/shared/random";
import { claimTimeout, currentRound, playMove, startTournament, tournamentView, turnDeadline } from "../src/shared/tournament/tournament";
import type { Tournament, TurnMatch } from "../src/shared/tournament/types";
import { RoomService } from "../src/server/rooms/roomService";
import { FakeTicker } from "./support/fakeTicker";
import { FakeTransport, lastRoom, type FakeConnection } from "./support/fakeTransport";
import { MemoryRoomStore } from "./support/memoryRoomStore";
import { overlapping, turnedShip } from "../src/web/games/seabattle/fleetMoves";
import { cannonAim, cellMiddle, STAGE, STAGE_LENGTH, stageLayout } from "../src/web/games/seabattle/stageGeometry";
import { landingCue, lastMarkSound, shotResult, shotVolume } from "../src/web/games/seabattle/seaBattleCues";

/**
 * Two fleets on the 8×8 board (ships 5, 4, 3, 3, 2), none touching:
 *   row 0: the 5 from A1      row 2: the 4 from A3     row 4: a 3 from A5
 *   row 6: the other 3 from A7, and the 2 from F7 (columns 5–6)
 */
const FLEET: Fleet = [
  { cell: 0, vertical: false },
  { cell: 16, vertical: false },
  { cell: 32, vertical: false },
  { cell: 48, vertical: false },
  { cell: 53, vertical: false },
];
const FLEET_CELLS = FLEET.flatMap((ship, index) => shipCells(ship, shipLength(index))!);
/** Every cell of the board with no ship. */
const WATER = Array.from({ length: CELL_COUNT }, (_, cell) => cell).filter((cell) => !FLEET_CELLS.includes(cell));

function must(result: ReturnType<typeof applyMove>): SeaBattleState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** Both players place FLEET; seat 0 fires first. */
function placed(starter: Seat = 0): SeaBattleState {
  let state = createGame(starter);
  state = must(applyMove(state, 0, { place: FLEET }));
  return must(applyMove(state, 1, { place: FLEET }));
}

const fire = (state: SeaBattleState, seat: Seat, cell: number) => must(applyMove(state, seat, { fire: cell }));

describe("Sea Battle fleets", () => {
  it("keeps ships straight, on the board and off each other, but lets them touch", () => {
    expect(isValidFleet(FLEET)).toBe(true);
    expect(shipCells({ cell: 4, vertical: false }, 5)).toBeNull(); // runs off the right edge
    expect(shipCells({ cell: 40, vertical: true }, 4)).toBeNull(); // runs off the bottom
    // The 2 moved to D6, its corners touching both 3s, or right beside the 5: allowed (owner decision).
    expect(isValidFleet(FLEET.map((ship, i) => (i === 4 ? { cell: 43, vertical: false } : ship)))).toBe(true);
    expect(isValidFleet(FLEET.map((ship, i) => (i === 4 ? { cell: 8, vertical: false } : ship)))).toBe(true);
    // On top of the 3 at A5: refused.
    expect(isValidFleet(FLEET.map((ship, i) => (i === 4 ? { cell: 33, vertical: false } : ship)))).toBe(false);
    expect(isValidFleet(FLEET.slice(0, 4))).toBe(false);
    expect(fitsAt(FLEET, 4, { cell: 61, vertical: false })).toBe(true); // the 2 may move along the bottom row
  });

  it("makes random fleets that are always legal", () => {
    for (let seed = 1; seed <= 300; seed++) expect(isValidFleet(randomFleet(seededRandom(seed)))).toBe(true);
  });

  it("finishes a half-placed fleet: the ships already down stay, one lying on another is moved", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const half = completeFleet([FLEET[0]!, null, FLEET[2]!, null, null], seededRandom(seed));
      expect(isValidFleet(half)).toBe(true);
      expect([half[0], half[2]]).toEqual([FLEET[0], FLEET[2]]);
      // The 4 standing down from B1, over the 5: the 5 stays, the 4 goes somewhere it fits.
      const clash = completeFleet([FLEET[0]!, { cell: 1, vertical: true }, null, null, null], seededRandom(seed));
      expect(isValidFleet(clash)).toBe(true);
      expect(clash[0]).toEqual(FLEET[0]);
    }
  });

  it("turns a ship around the cell pressed, kept on the board, even onto another ship", () => {
    // The 5 along row 1, pressed on C1 (its third cell): down from C1 (it would start above the board).
    expect(turnedShip(FLEET[0]!, 0, 2)).toEqual({ cell: 2, vertical: true });
    expect(turnedShip(FLEET[0]!, 0, 0)).toEqual({ cell: 0, vertical: true });
    // The 4 along row 3, pressed on B3: down column B, B3 still its second cell (B2 to B5).
    expect(turnedShip(FLEET[1]!, 1, 1)).toEqual({ cell: 9, vertical: true });
    // A 3 along row 7, pressed on A7: it would run off the bottom, so it stands A6 to A8.
    expect(turnedShip(FLEET[3]!, 3, 0)).toEqual({ cell: 40, vertical: true });
    // Back across around the pressed cell: a 3 standing B2 to B4, pressed on B3 → A3 to C3.
    expect(turnedShip({ cell: 9, vertical: true }, 2, 1)).toEqual({ cell: 16, vertical: false });
    // The 5 turned down from C1 (to C5) lies over the 4 in row 3 and the 3 in row 5: all three show as overlapping, and the fleet can't be sent.
    const turned = FLEET.map((ship, i) => (i === 0 ? turnedShip(ship, 0, 2) : ship));
    expect([...overlapping(turned)]).toEqual([0, 1, 2]);
    expect(isValidFleet(turned)).toBe(false);
    expect(overlapping(FLEET).size).toBe(0);
  });

  it("reads moves from the wire carefully", () => {
    expect(parseMove({ fire: 12 })).toEqual({ fire: 12 });
    expect(parseMove({ fire: "12" })).toBeNull();
    expect(parseMove({ place: FLEET })).toEqual({ place: FLEET });
    expect(parseMove({ place: FLEET.slice(1) })).toBeNull();
    expect(parseMove({ place: [...FLEET.slice(1), { cell: 1, vertical: "no" }] })).toBeNull();
    expect(parseMove(null)).toBeNull();
  });
});

describe("Sea Battle's firing stage", () => {
  const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

  it("lays the stage out the same size whichever board is big, in portrait and landscape", () => {
    for (const landscape of [false, true]) {
      for (const farBig of [false, true]) {
        const layout = stageLayout(landscape, farBig);
        const long = landscape ? layout.width : layout.height;
        close(long, STAGE_LENGTH);
        close(landscape ? layout.height : layout.width, 1);
        // One board big, the other small, both inside the stage.
        expect([layout.far.scale, layout.near.scale].sort()).toEqual([STAGE.small, 1]);
        for (const board of [layout.far, layout.near]) {
          expect(board.x + board.scale).toBeLessThanOrEqual(layout.width + 1e-9);
          expect(board.y + board.scale).toBeLessThanOrEqual(layout.height + 1e-9);
        }
      }
    }
  });

  it("keeps their waters on top (right in landscape) and yours under (left): the boards trade sizes, not places", () => {
    for (const farBig of [false, true]) {
      const portrait = stageLayout(false, farBig);
      expect(portrait.far.y).toBeLessThan(portrait.near.y);
      const landscape = stageLayout(true, farBig);
      expect(landscape.far.x).toBeGreaterThan(landscape.near.x);
    }
  });

  it("points your cannon up at their waters, toward the cell aimed at, never the long way round", () => {
    const layout = stageLayout(false, true);
    close(cannonAim(layout.near, layout.far, null).angle, 0);
    expect(cannonAim(layout.near, layout.far, 0).angle).toBeLessThan(0); // A1: up and to the left
    expect(cannonAim(layout.near, layout.far, 7).angle).toBeGreaterThan(0); // H1: up and to the right
    // Theirs, on top, points down at yours: within half a turn of straight down.
    const theirs = stageLayout(false, false);
    for (let cell = 0; cell < CELL_COUNT; cell++) expect(Math.abs(cannonAim(theirs.far, theirs.near, cell).angle - 180)).toBeLessThan(90);
  });

  it("fires the ball from the muzzle, along the barrel, to the cell's middle", () => {
    const layout = stageLayout(true, true);
    const aim = cannonAim(layout.near, layout.far, 27);
    const reach = Math.hypot(aim.muzzle.x - aim.at.x, aim.muzzle.y - aim.at.y);
    close(reach, STAGE.cannon * STAGE.muzzle);
    const to = cellMiddle(layout.far, 27);
    const along = Math.atan2(to.x - aim.at.x, aim.at.y - to.y);
    close(along, (aim.angle * Math.PI) / 180);
  });
});

describe("Sea Battle's sounds", () => {
  // Seat 0 fires at the 2 (F7, G7: cells 53, 54): a hit, then the sinking; and at open water.
  const hit = fire(placed(), 0, 53);
  const sunk = fire(hit, 0, 54);
  const missed = fire(placed(), 0, WATER[0]!);

  it("knows what a shot did", () => {
    expect(shotResult(hit, 1, 53)).toBe("hit");
    expect(shotResult(sunk, 1, 53)).toBe("sunk");
    expect(shotResult(sunk, 1, 54)).toBe("sunk");
    expect(shotResult(missed, 1, WATER[0]!)).toBe("miss");
  });

  it("a hit is nearer and heavier on your own ship, plainer watching; a sinking sounds like a hit and feels like a sinking", () => {
    expect(landingCue("hit", 0, 0)).toEqual({ sound: "seaBattleYouHit", volume: 1, feel: null });
    expect(landingCue("hit", 0, 1)).toEqual({ sound: "seaBattleYourShipHit", volume: 1, feel: null });
    expect(landingCue("hit", 0, null).sound).toBe("seaBattleHit");
    // A sinking sounds like a hit and feels like a sinking (yours or theirs; nothing watching).
    expect(landingCue("sunk", 1, 1)).toEqual({ sound: "seaBattleYouHit", volume: 1, feel: "seaBattleYouSank" });
    expect(landingCue("sunk", 1, 0)).toEqual({ sound: "seaBattleYourShipHit", volume: 1, feel: "seaBattleYourShipSank" });
    expect(landingCue("sunk", 1, null).feel).toBeNull();
    expect(landingCue("sunk", 1, null).sound).toBe("seaBattleHit");
  });

  it("anyone's splash is the same, quieter when it isn't yours", () => {
    expect(landingCue("miss", 0, 0)).toEqual({ sound: "seaBattleSplash", volume: 1, feel: null });
    expect(landingCue("miss", 0, 1).volume).toBeLessThan(1);
    expect(landingCue("miss", 0, null).volume).toBeLessThan(landingCue("miss", 0, 1).volume);
    expect(shotVolume(1, 1)).toBe(1);
  });

  it("the ending plays the last shot's plain landing", () => {
    expect(lastMarkSound(placed())).toBeNull();
    expect(lastMarkSound(missed)?.sound).toBe("seaBattleSplash");
    expect(lastMarkSound(hit)?.sound).toBe("seaBattleHit");
    expect(lastMarkSound(sunk)?.sound).toBe("seaBattleHit");
  });
});

describe("Sea Battle rules", () => {
  it("lets both players place at once, and fires only once both are ready", () => {
    let state = createGame(1);
    expect(seatsToMove(state)).toEqual([0, 1]);
    expect(applyMove(state, 1, { fire: 0 })).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    expect(applyMove(state, 0, { place: FLEET.slice(0, 4) })).toEqual({ ok: false, error: "INVALID_MOVE" });
    state = must(applyMove(state, 0, { place: FLEET }));
    expect(state.phase).toBe("place");
    expect(seatsToMove(state)).toEqual([1]);
    expect(applyMove(state, 0, { place: FLEET })).toEqual({ ok: false, error: "INVALID_MOVE" }); // no second go
    state = must(applyMove(state, 1, { place: FLEET }));
    expect(state.phase).toBe("fire");
    expect(state.turn).toBe(1); // the starter fires first
  });

  it("passes the turn on a miss and fires again on a hit", () => {
    let state = placed();
    state = fire(state, 0, 0); // hit
    expect(state.marks[1][0]).toBe(MARK.hit);
    expect(state.turn).toBe(0);
    state = fire(state, 0, 8); // miss
    expect(state.marks[1][8]).toBe(MARK.miss);
    expect(state.turn).toBe(1);
    expect(applyMove(state, 0, { fire: 9 })).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    state = fire(state, 1, 63); // miss
    expect(applyMove(state, 0, { fire: 0 })).toEqual({ ok: false, error: "CELL_TAKEN" });
  });

  it("shows a sunk ship to both, and marks nothing around it (ships may touch)", () => {
    let state = placed();
    state = fire(state, 0, 53);
    expect(state.wrecks[1]).toEqual([]); // one hit tells nothing more
    state = fire(state, 0, 54); // the 2
    expect(state.wrecks[1]).toEqual([{ ...FLEET[4], index: 4 }]);
    expect(state.marks[1].filter((m) => m !== MARK.none)).toHaveLength(2);
  });

  it("lets the second player win by sinking everything first", () => {
    let state = placed();
    state = fire(state, 0, WATER[0]!);
    for (const cell of FLEET_CELLS) state = fire(state, 1, cell);
    expect(state.winner).toBe(1);
  });

  it("ends the moment a whole fleet is sunk, the starter's too: no last turn for the other player", () => {
    let state = placed();
    for (const cell of FLEET_CELLS) state = fire(state, 0, cell);
    expect(state.winner).toBe(0);
    expect(isGameOver(state)).toBe(true);
    expect(applyMove(state, 1, { fire: WATER[0]! })).toEqual({ ok: false, error: "GAME_OVER" });
  });

  it("fires at the first untouched cell when time runs out, and places random fleets for anyone not ready", () => {
    let state = must(applyMove(createGame(0), 1, { place: FLEET }));
    state = expire(state, 99);
    expect(state.phase).toBe("fire");
    expect(state.fleets[1]).toEqual(FLEET); // the ready one keeps theirs
    expect(isValidFleet(state.fleets[0]!)).toBe(true);
    expect(expire(must(applyMove(createGame(0), 1, { place: FLEET })), 99).fleets[0]).toEqual(state.fleets[0]); // same seed, same fleet

    state = fire(state, 0, 0);
    expect(autoShot(state)).toBe(1);
  });

  it("hides fleets from everyone but their owner until the match is over", () => {
    const state = placed();
    expect(viewFor(state, 0).fleets).toEqual([FLEET, null]);
    expect(viewFor(state, 1).fleets).toEqual([null, FLEET]);
    expect(viewFor(state, null).fleets).toEqual([null, null]);
    let over = state;
    for (const cell of FLEET_CELLS) over = fire(over, 0, cell);
    expect(viewFor(over, null).fleets).toEqual([FLEET, FLEET]);
  });

  it("always ends with legal moves, whoever fires wherever", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = seededRandom(seed);
      let state = createGame(seed % 2 === 0 ? 0 : 1);
      state = must(applyMove(state, 0, { place: randomFleet(random) }));
      state = must(applyMove(state, 1, { place: randomFleet(random) }));
      let shots = 0;
      while (state.winner === null) {
        const target = state.marks[state.turn === 0 ? 1 : 0];
        const open = target.flatMap((mark, cell) => (mark === MARK.none ? [cell] : []));
        state = fire(state, state.turn, open[Math.floor(random() * open.length)]!);
        expect(++shots).toBeLessThanOrEqual(2 * CELL_COUNT);
      }
      expect(state.wrecks[0].length === FLEET_SIZE || state.wrecks[1].length === FLEET_SIZE).toBe(true);
    }
  });
});

describe("Sea Battle in a tournament", () => {
  const start = (): Tournament =>
    startTournament(
      "seabattle",
      [
        { id: 0, name: "Ana", trophies: 0, joinOrder: 0 },
        { id: 1, name: "Ben", trophies: 0, joinOrder: 1 },
      ],
      0,
      7,
    );
  const matchOf = (t: Tournament) => currentRound(t).matches[0] as TurnMatch;
  const game = (t: Tournament) => matchOf(t).game as SeaBattleState;
  const update = (result: ReturnType<typeof playMove>) => {
    if (!result.ok) throw new Error(result.error);
    return result.tournament;
  };

  it("gives placing its own time, which one player getting ready doesn't restart", () => {
    let t = start();
    expect(turnDeadline(t, matchOf(t))).toBe(SEABATTLE_CONFIG.placeTimeMs);
    t = update(playMove(t, 0, { place: FLEET }, 10_000));
    expect(turnDeadline(t, matchOf(t))).toBe(SEABATTLE_CONFIG.placeTimeMs);
    t = update(playMove(t, 1, { place: FLEET }, 20_000));
    expect(turnDeadline(t, matchOf(t))).toBe(20_000 + SEABATTLE_CONFIG.turnTimeMs);
  });

  it("places for whoever isn't ready when placing runs out", () => {
    let t = start();
    t = update(playMove(t, 0, { place: FLEET }, 1_000));
    expect(claimTimeout(t, matchOf(t).id, SEABATTLE_CONFIG.placeTimeMs - 1, 5)).toEqual({ ok: false, error: "TOO_EARLY" });
    t = update(claimTimeout(t, matchOf(t).id, SEABATTLE_CONFIG.placeTimeMs, 5));
    expect(game(t).phase).toBe("fire");
    expect(isValidFleet(game(t).fleets[1]!)).toBe(true);
  });

  it("shows each player only their own fleet, and watchers none, while the match is played", () => {
    let t = start();
    t = update(playMove(t, 0, { place: FLEET }, 1_000));
    const mine = (viewer: number | null) => (currentRound(tournamentView(t, viewer)).matches[0]!.game as SeaBattleState).fleets;
    const seatOf0 = matchOf(t).players.indexOf(0);
    expect(mine(0)[seatOf0]).toEqual(FLEET);
    expect(mine(1)).toEqual([null, null]); // player 1 hasn't placed, and can't see player 0's
    expect(mine(null)).toEqual([null, null]);
    expect(game(t).fleets[seatOf0]).toEqual(FLEET); // the server keeps everything
  });
});

describe("Sea Battle over the wire", () => {
  it("never sends a fleet to anyone but its owner while the match is played", () => {
    const CODE = "401234";
    const now = 1_000_000;
    const store = new MemoryRoomStore();
    const transport = new FakeTransport();
    const service = new RoomService(store, transport, () => now, new FakeTicker());
    service.createRoom(CODE);
    let tokens = 0;
    const join = (name: string): FakeConnection => {
      const conn = transport.connect(CODE);
      service.join(CODE, { name, token: null, newToken: `t${++tokens}` }, conn);
      return conn;
    };
    const send = (conn: FakeConnection, msg: object) => service.receive(CODE, conn.playerId!, JSON.stringify(msg));
    const host = join("Host");
    const guest = join("Guest");
    const watcher = join("Late");
    send(host, { type: "start", gameId: "seabattle" });
    // Everyone was in the room at the start, but two play: the third sits out (a bye).
    send(host, { type: "move", move: { place: FLEET } });
    const fleetsSeenBy = (conn: FakeConnection) =>
      currentRound(lastRoom(conn)!.tournament!).matches.flatMap((m) => (m.game as SeaBattleState).fleets);
    expect(fleetsSeenBy(host)).toContainEqual(FLEET);
    expect(fleetsSeenBy(guest).filter((f) => f !== null)).toEqual([]);
    expect(fleetsSeenBy(watcher).filter((f) => f !== null)).toEqual([]);
    // Every message the others got, not just the last one.
    for (const conn of [guest, watcher]) expect(JSON.stringify(conn.received)).not.toContain('"vertical"'); // no ship anywhere (nothing is sunk yet)
  });
});
