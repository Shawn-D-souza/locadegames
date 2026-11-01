import { beforeEach, describe, expect, it } from "vitest";
import { TICTACTOE_CONFIG } from "../src/shared/games/tictactoe/config";
import { CLOSE_CODES } from "../src/shared/protocol/errors";
import { ROOM_CONFIG } from "../src/shared/rooms/config";
import { currentRound, findActiveMatch } from "../src/shared/tournament/tournament";
import { RoomService } from "../src/server/rooms/roomService";
import { TERRITORY_CONFIG } from "../src/shared/games/territory/config";
import { decodeServerMessage, encodeClientMessage } from "../src/shared/games/territory/wire";
import { FakeTicker } from "./support/fakeTicker";
import { FakeTransport, lastRoom, type FakeConnection } from "./support/fakeTransport";
import { MemoryRoomStore } from "./support/memoryRoomStore";

const CODE = "401234";
const GAME = "tictactoe";
/** X wins on the top row; O fills the middle row. */
const X_WINS = [0, 3, 1, 4, 2];

describe("RoomService", () => {
  let now: number;
  let store: MemoryRoomStore;
  let transport: FakeTransport;
  let service: RoomService;
  let tokenCount: number;
  let ticker: FakeTicker;

  const join = (name: string, token: string | null = null): FakeConnection => {
    const conn = transport.connect(CODE);
    service.join(CODE, { name, token, newToken: `token-${++tokenCount}` }, conn);
    return conn;
  };
  const send = (conn: FakeConnection, msg: object) => service.receive(CODE, conn.playerId!, JSON.stringify(msg));
  const tournament = () => store.get(CODE)!.tournament!;

  /** Plays X_WINS in the match `first` is in; `first` must be seat 0 (X). */
  const winMatch = (first: FakeConnection, second: FakeConnection) => {
    X_WINS.forEach((cell, i) => send(i % 2 === 0 ? first : second, { type: "move", move: cell }));
  };

  beforeEach(() => {
    now = 1_000_000;
    store = new MemoryRoomStore();
    transport = new FakeTransport();
    ticker = new FakeTicker();
    service = new RoomService(store, transport, () => now, ticker);
    tokenCount = 0;
    expect(service.createRoom(CODE)).toBe(true);
  });

  it("refuses duplicate codes and keeps the existing room", () => {
    join("Host");
    expect(service.createRoom(CODE)).toBe(false);
    expect(store.get(CODE)!.players.map((p) => p.name)).toEqual(["Host"]);
  });

  it("gives players slots in join order and hides tokens", () => {
    const host = join("Host");
    const guest = join("Guest");
    expect(host.playerId).toBe(0);
    expect(guest.playerId).toBe(1);
    expect(host.received[0]).toEqual({ type: "welcome", playerId: 0, token: "token-1" });
    const room = lastRoom(host)!;
    expect(room.hostId).toBe(0);
    expect(room.phase).toBe("lobby");
    expect(room.players.map((p) => p.name)).toEqual(["Host", "Guest"]);
    expect(JSON.stringify(room)).not.toContain("token-");
  });

  it("caps the room at the player limit and rejects unknown rooms", () => {
    for (let i = 0; i < ROOM_CONFIG.maxPlayers; i++) join(`P${i}`);
    expect(join("Extra").closedWith).toBe(CLOSE_CODES.roomFull);
    const lost = transport.connect("499999");
    service.join("499999", { name: "X", token: null, newToken: "t" }, lost);
    expect(lost.closedWith).toBe(CLOSE_CODES.roomNotFound);
  });

  it("lets anyone suggest a game but only the host start one", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(guest, { type: "suggest", gameId: GAME });
    expect(lastRoom(host)!.players[1]!.suggestion).toBe(GAME);
    send(guest, { type: "start", gameId: GAME });
    expect(guest.received.at(-1)).toEqual({ type: "error", error: "NOT_HOST" });
    send(host, { type: "start", gameId: GAME });
    const room = lastRoom(guest)!;
    expect(room.phase).toBe("playing");
    expect(room.players.every((p) => p.suggestion === null)).toBe(true);
  });

  it("needs enough players to start", () => {
    const host = join("Host");
    send(host, { type: "start", gameId: GAME });
    expect(host.received.at(-1)).toEqual({ type: "error", error: "NOT_ENOUGH_PLAYERS" });
  });

  it("plays a 2-player room as a single final and awards a trophy", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    send(guest, { type: "move", move: 0 });
    expect(guest.received.at(-1)).toEqual({ type: "error", error: "NOT_YOUR_TURN" });
    winMatch(host, guest);
    const room = lastRoom(guest)!;
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([0]);
    expect(room.players[0]!.trophies).toBe(1);

    send(guest, { type: "backToRoom" });
    expect(guest.received.at(-1)).toEqual({ type: "error", error: "NOT_HOST" });
    send(host, { type: "backToRoom" });
    expect(lastRoom(guest)!.phase).toBe("lobby");
  });

  it("gives both players a trophy when a 2-player match is drawn", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    // X O X / X O O / O X X
    [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach((cell, i) => send(i % 2 === 0 ? host : guest, { type: "move", move: cell }));
    const room = lastRoom(host)!;
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([0, 1]);
    expect(room.players.map((p) => p.trophies)).toEqual([1, 1]);
  });

  it("seeds the next tournament by trophies", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    // Guest (O) wins the middle row while X scatters.
    for (const [conn, cell] of [[host, 0], [guest, 3], [host, 1], [guest, 4], [host, 8], [guest, 5]] as const) {
      send(conn, { type: "move", move: cell });
    }
    expect(lastRoom(host)!.players[1]!.trophies).toBe(1);
    send(host, { type: "start", gameId: GAME });
    expect(currentRound(tournament()).matches[0]!.players).toEqual([1, 0]);
  });

  it("plays the auto move when a turn timer runs out, and not before", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    const matchId = currentRound(tournament()).matches[0]!.id;
    now += TICTACTOE_CONFIG.turnTimeMs - 1;
    send(guest, { type: "timeout", matchId });
    expect(findActiveMatch(tournament(), 0)!.game.board[0]).toBeNull();
    now += 1;
    send(guest, { type: "timeout", matchId });
    const match = findActiveMatch(tournament(), 0)!;
    expect(match.game.board[0]).toBe(0);
  });

  it("lets a disconnected player reclaim their slot with the token", () => {
    const host = join("Host");
    join("Guest");
    service.disconnect(CODE, 0);
    expect(store.get(CODE)!.players[0]!.connected).toBe(false);
    const back = join("ignored", "token-1");
    expect(back.playerId).toBe(0);
    expect(lastRoom(back)!.players[0]).toMatchObject({ name: "Host", connected: true });
    expect(host.closedWith).toBe(CLOSE_CODES.replaced);
  });

  it("gives an away seat back to the same name when the token is lost, but never a connected one", () => {
    const host = join("Host");
    join("Guest");
    send(host, { type: "start", gameId: GAME });
    service.disconnect(CODE, 1);
    const back = join("guest");
    expect(back.playerId).toBe(1);
    expect(back.received[0]).toEqual({ type: "welcome", playerId: 1, token: "token-2" });
    expect(lastRoom(back)!.players).toHaveLength(2);
    expect(lastRoom(back)!.phase).toBe("playing");
    expect(join("Host").playerId).toBe(2);
  });

  it("forfeits the match of a player who leaves mid-game", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    send(guest, { type: "leave" });
    expect(guest.closedWith).toBe(CLOSE_CODES.left);
    const room = lastRoom(host)!;
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([0]);
    expect(currentRound(room.tournament!).matches[0]!.result).toBe("forfeit");
  });

  it("lets a player quit the tournament but stay in the room to watch", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    send(guest, { type: "quit" });
    expect(guest.closedWith).toBeNull();
    const room = lastRoom(guest)!;
    expect(room.players).toHaveLength(2);
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([0]);
    expect(currentRound(room.tournament!).matches[0]!.result).toBe("forfeit");
  });

  it("hands host to the earliest joiner and deletes the room when everyone leaves", () => {
    const host = join("Host");
    const second = join("Second");
    const third = join("Third");
    send(host, { type: "leave" });
    expect(lastRoom(third)!.hostId).toBe(1);
    expect(join("Fourth").playerId).toBe(0);
    send(second, { type: "leave" });
    expect(lastRoom(third)!.hostId).toBe(2);
    for (const conn of transport["connections"].get(CODE)!) if (conn.playerId !== null) send(conn, { type: "leave" });
    expect(store.get(CODE)).toBeNull();
  });

  it("sweeps stale rooms when creating new ones", () => {
    join("Host");
    service.disconnect(CODE, 0);
    now += ROOM_CONFIG.emptyRoomTtlMs + ROOM_CONFIG.sweepIntervalMs + 1;
    service.createRoom("405678");
    expect(store.get(CODE)).toBeNull();
    expect(store.get("405678")).not.toBeNull();
  });

  describe("real-time arena (Territory)", () => {
    const frames = (conn: FakeConnection) => conn.frames.map((f) => decodeServerMessage(f));
    const binary = (conn: FakeConnection, data: Uint8Array) =>
      service.receiveBinary(CODE, conn.playerId!, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);

    it("runs one match for everyone, streams snapshots and ends when one player is left", () => {
      const host = join("Host");
      const guest = join("Guest");
      send(host, { type: "start", gameId: "territory" });
      const arena = lastRoom(guest)!.arena!;
      expect(arena.entrants.map((e) => e.id)).toEqual([0, 1]);
      expect(arena.startsAt).toBe(now + TERRITORY_CONFIG.countdownMs);
      expect(frames(guest)[0]?.kind).toBe("full");
      expect(ticker.running).toBe(true);

      // Countdown: no steps yet; then one snapshot per step.
      ticker.fire();
      expect(guest.frames).toHaveLength(1);
      now = arena.startsAt + 3 * TERRITORY_CONFIG.tickMs;
      ticker.fire();
      expect(frames(guest).slice(1).map((m) => m?.kind === "snapshot" && m.tick)).toEqual([1, 2, 3]);

      // Steering is applied on the step it is stamped for.
      binary(guest, encodeClientMessage({ kind: "input", seq: 1, tick: 5, target: 1_000 }));
      now += 2 * TERRITORY_CONFIG.tickMs;
      ticker.fire();
      const last = frames(guest).at(-1);
      expect(last?.kind === "snapshot" && last.heads.find((h) => h.id === 1)).toMatchObject({ target: 1_000, inputSeq: 1 });

      // A quit takes the player out on the next step; the last one in wins and gets a trophy.
      send(guest, { type: "quit" });
      now += TERRITORY_CONFIG.tickMs;
      ticker.fire();
      const room = lastRoom(host)!;
      expect(room.phase).toBe("finished");
      expect(room.arena!.championIds).toEqual([0]);
      expect(room.arena!.results.map((r) => [r.id, r.place, r.quit])).toEqual([
        [0, 1, false],
        [1, 2, true],
      ]);
      expect(room.players.find((p) => p.id === 0)!.trophies).toBe(1);
      expect(ticker.running).toBe(false);
    });

    it("sends the whole live state to a player who comes back, and answers pings", () => {
      const host = join("Host");
      join("Guest");
      send(host, { type: "start", gameId: "territory" });
      service.disconnect(CODE, 1);
      const back = join("Guest");
      expect(frames(back).map((m) => m?.kind)).toEqual(["full"]);
      binary(back, encodeClientMessage({ kind: "ping", clientTime: 123 }));
      expect(frames(back).at(-1)).toMatchObject({ kind: "pong", clientTime: 123, serverTime: now });
    });

    it("returns the room to the lobby if the live match was lost (server restart)", () => {
      const host = join("Host");
      join("Guest");
      send(host, { type: "start", gameId: "territory" });
      // A fresh service over the same store: the in-memory match is gone.
      service = new RoomService(store, transport, () => now, new FakeTicker());
      send(host, { type: "suggest", gameId: "tictactoe" });
      expect(lastRoom(host)!.phase).toBe("lobby");
      expect(lastRoom(host)!.arena).toBeNull();
    });
  });
});
