import { beforeEach, describe, expect, it } from "vitest";
import { TICTACTOE_CONFIG } from "../src/shared/games/tictactoe/config";
import type { TicTacToeState } from "../src/shared/games/tictactoe/types";
import { CLOSE_CODES } from "../src/shared/protocol/errors";
import { ROOM_CONFIG } from "../src/shared/rooms/config";
import { currentRound, findActiveMatch } from "../src/shared/tournament/tournament";
import { RoomService } from "../src/server/rooms/roomService";
import { TERRITORY_CONFIG } from "../src/shared/games/territory/config";
import { decodeServerMessage, encodeClientMessage } from "../src/shared/games/territory/wire";
import { BUTTON_RIGHT, HEADCRASH_CONFIG } from "../src/shared/games/headcrash/config";
import { PHASE } from "../src/shared/games/headcrash/types";
import { HIDDEN_PICK } from "../src/shared/games/dotsclash/rules";
import type { Party } from "../src/shared/party/types";
import { decodeServerMessage as decodeDuelMessage, encodeClientMessage as encodeDuelMessage, type HeadCrashClientMessage } from "../src/shared/games/headcrash/wire";
import { TOURNAMENT_CONFIG } from "../src/shared/tournament/config";
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

  /** The two players of the first match, the one who starts (X, picked by the coin) first. */
  const seated = (...conns: FakeConnection[]): [FakeConnection, FakeConnection] => {
    const [x, o] = currentRound(tournament()).matches[0]!.players;
    return [conns.find((c) => c.playerId === x)!, conns.find((c) => c.playerId === o)!];
  };

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
    const [x, o] = seated(host, guest);
    send(o, { type: "move", move: 0 });
    expect(o.received.at(-1)).toEqual({ type: "error", error: "NOT_YOUR_TURN" });
    winMatch(x, o);
    const room = lastRoom(guest)!;
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([x.playerId]);
    expect(room.players[x.playerId!]!.trophies).toBe(1);

    send(guest, { type: "backToRoom" });
    expect(guest.received.at(-1)).toEqual({ type: "error", error: "NOT_HOST" });
    send(host, { type: "backToRoom" });
    expect(lastRoom(guest)!.phase).toBe("lobby");
  });

  it("gives both players a trophy when a 2-player match is drawn", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    const [x, o] = seated(host, guest);
    // X O X / X O O / O X X
    [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach((cell, i) => send(i % 2 === 0 ? x : o, { type: "move", move: cell }));
    const room = lastRoom(host)!;
    expect(room.phase).toBe("finished");
    expect(room.tournament!.championIds).toEqual([0, 1]);
    expect(room.players.map((p) => p.trophies)).toEqual([1, 1]);
  });

  it("seeds the next tournament by trophies", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    // Guest wins.
    if (seated(host, guest)[0] === guest) winMatch(guest, host);
    else for (const [conn, cell] of [[host, 0], [guest, 3], [host, 1], [guest, 4], [host, 8], [guest, 5]] as const) {
      send(conn, { type: "move", move: cell });
    }
    expect(lastRoom(host)!.players[1]!.trophies).toBe(1);
    send(host, { type: "start", gameId: GAME });
    expect(tournament().entrants.map((e) => e.id)).toEqual([1, 0]);
  });

  it("plays the auto move when a turn timer runs out, and not before", () => {
    const host = join("Host");
    const guest = join("Guest");
    send(host, { type: "start", gameId: GAME });
    const matchId = currentRound(tournament()).matches[0]!.id;
    now += TICTACTOE_CONFIG.turnTimeMs - 1;
    send(guest, { type: "timeout", matchId });
    expect((findActiveMatch(tournament(), 0)!.game as TicTacToeState).board[0]).toBeNull();
    now += 1;
    send(guest, { type: "timeout", matchId });
    const match = findActiveMatch(tournament(), 0)!;
    expect((match.game as TicTacToeState).board[0]).toBe(0); // the starter's (seat 0) auto move
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

  describe("real-time 1v1 matches (Head Crash)", () => {
    const TICK = HEADCRASH_CONFIG.tickMs;
    const snapshots = (conn: FakeConnection) =>
      conn.frames.map((f) => decodeDuelMessage(f)).flatMap((m) => (m?.kind === "snapshot" ? [m] : []));
    const binary = (conn: FakeConnection, msg: HeadCrashClientMessage) => {
      const data = encodeDuelMessage(msg);
      service.receiveBinary(CODE, conn.playerId!, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    };
    /** Runs the server's loop over this much time, a step at a time. */
    const run = (ms: number) => {
      for (const end = now + ms; now < end; ) {
        now = Math.min(end, now + TICK);
        ticker.fire();
      }
    };
    /** Runs until the tournament's record satisfies `done` (or far too long has passed). */
    const runUntil = (done: () => boolean) => {
      for (let i = 0; i < 400 && !done(); i++) run(1_000);
      expect(done()).toBe(true);
    };
    const matchOf = (id: number) => tournament().rounds.flatMap((r) => r.matches).find((m) => m.id === id)!;

    it("runs each match of the round for its two players, and for whoever watches it", () => {
      const conns = [join("A"), join("B"), join("C"), join("D")];
      send(conns[0]!, { type: "start", gameId: "headcrash" });
      const [first, second] = currentRound(tournament()).matches;
      expect(ticker.running).toBe(true);
      run(10 * TICK);

      for (const conn of conns) {
        const mine = findActiveMatch(tournament(), conn.playerId!)!;
        const seen = snapshots(conn);
        expect(seen.length).toBeGreaterThanOrEqual(4);
        expect(seen.length).toBeLessThanOrEqual(6);
        expect(seen.every((s) => s.matchId === mine.id)).toBe(true);
        expect(seen.at(-1)!.state).toMatchObject({ phase: PHASE.countdown, round: 0, score: [0, 0] });
      }

      // Watching the other match: its state at once, then both streams until the watcher stops.
      const watcher = conns.find((c) => first!.players.includes(c.playerId!))!;
      const before = snapshots(watcher).length;
      binary(watcher, { kind: "watch", matchId: second!.id });
      expect(snapshots(watcher).slice(before).map((s) => s.matchId)).toEqual([second!.id]);
      run(4 * TICK);
      expect(new Set(snapshots(watcher).slice(before).map((s) => s.matchId))).toEqual(new Set([first!.id, second!.id]));
      binary(watcher, { kind: "unwatch", matchId: second!.id });
      const after = snapshots(watcher).length;
      run(4 * TICK);
      expect(snapshots(watcher).slice(after).every((s) => s.matchId === first!.id)).toBe(true);

      binary(watcher, { kind: "ping", clientTime: 77 });
      expect(decodeDuelMessage(watcher.frames.at(-1)!)).toEqual({ kind: "pong", clientTime: 77, serverTime: now });
    });

    it("takes buttons only from the match's own players", () => {
      const conns = [join("A"), join("B"), join("C"), join("D")];
      send(conns[0]!, { type: "start", gameId: "headcrash" });
      const [first, second] = currentRound(tournament()).matches;
      const player = conns.find((c) => c.playerId === first!.players[1])!;
      const stranger = conns.find((c) => c.playerId === second!.players[0])!;
      binary(stranger, { kind: "input", matchId: first!.id, seq: 1, tick: 2, buttons: BUTTON_RIGHT });
      binary(player, { kind: "input", matchId: first!.id, seq: 1, tick: 2, buttons: BUTTON_RIGHT });
      run(4 * TICK);
      expect(snapshots(player).at(-1)!.state.buttons).toEqual([0, BUTTON_RIGHT]);
      expect(snapshots(stranger).at(-1)!.state.buttons).toEqual([0, 0]);
    });

    it("plays a match to its end: points reach the room as they are scored, and the tournament finishes", () => {
      const host = join("Host");
      const guest = join("Guest");
      send(host, { type: "start", gameId: "headcrash" });
      const match = currentRound(tournament()).matches[0]!;
      const driver = [host, guest].find((c) => c.playerId === match.players[0])!;
      // One car drives right the whole match, the other never moves: sooner or later heads get hit.
      binary(driver, { kind: "input", matchId: match.id, seq: 1, tick: 1, buttons: BUTTON_RIGHT });
      const scores: string[] = [];
      runUntil(() => {
        const score = "score" in matchOf(match.id).game ? (matchOf(match.id).game as { score: number[] }).score.join(":") : "";
        if (scores.at(-1) !== score) scores.push(score);
        return tournament().finished;
      });
      expect(scores[0]).toBe("0:0");
      expect(scores.length).toBeGreaterThan(1);
      const done = matchOf(match.id);
      const [a, b] = (done.game as { score: [number, number] }).score;
      if (done.result === "win") {
        // Five points, or ahead when rounds without a point ended it (both heads in the water on a map where the car can't reach the other).
        expect(Math.max(a, b)).toBeLessThanOrEqual(HEADCRASH_CONFIG.pointsToWin);
        expect(a).not.toBe(b);
        expect(done.winner).toBe(match.players[a > b ? 0 : 1]);
        expect(tournament().championIds).toEqual([done.winner]);
      } else {
        expect(done.result).toBe("draw");
        expect([...tournament().championIds].sort()).toEqual([0, 1]);
      }
      expect(lastRoom(host)!.phase).toBe("finished");
      expect(snapshots(guest).at(-1)!.state.phase).toBe(PHASE.over);
      expect(ticker.running).toBe(false);
    });

    it("stops a match when a player quits, and starts the next round's matches at its shared start", () => {
      const conns = [join("A"), join("B"), join("C"), join("D")];
      send(conns[0]!, { type: "start", gameId: "headcrash" });
      const [first, second] = currentRound(tournament()).matches;
      const quitter = conns.find((c) => c.playerId === first!.players[0])!;
      send(quitter, { type: "quit" });
      expect(matchOf(first!.id)).toMatchObject({ result: "forfeit", winner: first!.players[1] });
      const stayed = conns.find((c) => c.playerId === first!.players[1])!;
      const seen = snapshots(stayed).length;
      run(6 * TICK);
      expect(snapshots(stayed)).toHaveLength(seen);
      expect(ticker.running).toBe(true);

      // The other match ends too (its players both quit... one quits): the next round is set, and its match waits for the break.
      send(conns.find((c) => c.playerId === second!.players[0])!, { type: "quit" });
      expect(tournament().rounds).toHaveLength(2);
      const next = currentRound(tournament()).matches[0]!;
      expect(next.turnStartedAt).toBe(now + TOURNAMENT_CONFIG.roundBreakMs);
      const player = conns.find((c) => c.playerId === next.players[0])!;
      const waiting = snapshots(player).length;
      run(TOURNAMENT_CONFIG.roundBreakMs - 2 * TICK);
      expect(snapshots(player)).toHaveLength(waiting);
      run(6 * TICK);
      expect(snapshots(player).at(-1)).toMatchObject({ matchId: next.id, tickZeroAt: next.turnStartedAt });
    });

    it("picks a match up from its score on a fresh round if the server lost it (restart)", () => {
      const host = join("Host");
      const guest = join("Guest");
      send(host, { type: "start", gameId: "headcrash" });
      const match = currentRound(tournament()).matches[0]!;
      const driver = [host, guest].find((c) => c.playerId === match.players[0])!;
      binary(driver, { kind: "input", matchId: match.id, seq: 1, tick: 1, buttons: BUTTON_RIGHT });
      runUntil(() => (matchOf(match.id).game as { score: number[] }).score.some((n) => n > 0) || tournament().finished);
      if (tournament().finished) return;
      const score = (matchOf(match.id).game as { score: number[] }).score;

      // A fresh service over the same store: the live match is gone until a player's next frame.
      ticker = new FakeTicker();
      service = new RoomService(store, transport, () => now, ticker);
      expect(ticker.running).toBe(false);
      const before = snapshots(host).length;
      binary(host, { kind: "ping", clientTime: 1 });
      binary(host, { kind: "input", matchId: match.id, seq: 9, tick: 1, buttons: 0 });
      expect(ticker.running).toBe(true);
      run(4 * TICK);
      const resumed = snapshots(host).slice(before).at(-1)!;
      expect(resumed.state).toMatchObject({ score, round: score[0]! + score[1]!, phase: PHASE.countdown });
      expect(lastRoom(host)!.phase).toBe("playing");
    });
  });

  describe("a game everyone plays together (Dots Clash)", () => {
    const party = () => store.get(CODE)!.party! as Party<"dotsclash">;
    const conn = (conns: FakeConnection[], id: number) => conns.find((c) => c.playerId === id)!;

    it("puts everyone on one board, secret picks then turns, and refuses moves out of turn", () => {
      const conns = [join("Host"), join("Ana"), join("Ben")];
      send(conns[0]!, { type: "start", gameId: "dotsclash" });
      const p = party();
      expect(lastRoom(conns[1]!)!.party!.entrants).toHaveLength(3);
      expect(p.game.size).toBe(7);
      const [first, second, third] = p.entrants.map((e) => conn(conns, e.id));
      // Everyone picks at once: the second may go before the first, and nobody's phone learns where.
      send(second!, { type: "move", move: 24 });
      send(second!, { type: "move", move: 5 });
      expect(second!.received.at(-1)).toEqual({ type: "error", error: "NOT_YOUR_TURN" });
      send(first!, { type: "move", move: 0 });
      const seen = (lastRoom(third!)!.party as Party<"dotsclash">).game;
      expect(seen.picks).toEqual([HIDDEN_PICK, HIDDEN_PICK, null]);
      expect(seen.owners.every((owner) => owner === null)).toBe(true);
      send(third!, { type: "move", move: 40 });
      expect(party().game.phase).toBe("play");
      expect((lastRoom(third!)!.party as Party<"dotsclash">).game.owners[24]).toBe(1);
      send(second!, { type: "move", move: 24 });
      expect(second!.received.at(-1)).toEqual({ type: "error", error: "NOT_YOUR_TURN" });
      send(first!, { type: "move", move: 0 });
      expect(party().game.moves).toBe(2);
      // Whoever went first this time goes later next time.
      expect(store.get(CODE)!.players.find((pl) => pl.id === first!.playerId)!.firsts).toBe(1);
    });

    it("plays a timed-out turn only after the deadline", () => {
      const conns = [join("Host"), join("Ana")];
      send(conns[0]!, { type: "start", gameId: "dotsclash" });
      send(conns[1]!, { type: "timeout", matchId: 0 });
      expect(party().game.moves).toBe(0);
      now += 30_000;
      send(conns[1]!, { type: "timeout", matchId: 0 });
      expect(party().game.moves).toBe(1);
    });

    it("greys a quitter out and crowns the last one standing", () => {
      const conns = [join("Host"), join("Ana")];
      send(conns[0]!, { type: "start", gameId: "dotsclash" });
      const [first, second] = party().entrants.map((e) => conn(conns, e.id));
      send(first!, { type: "move", move: 0 });
      send(second!, { type: "quit" });
      const room = lastRoom(first!)!;
      expect(room.phase).toBe("finished");
      expect(room.party!.championIds).toEqual([first!.playerId]);
      expect(room.players.find((pl) => pl.id === first!.playerId)!.trophies).toBe(1);
      send(conns[0]!, { type: "backToRoom" });
      expect(lastRoom(first!)!.party).toBeNull();
    });
  });
});
