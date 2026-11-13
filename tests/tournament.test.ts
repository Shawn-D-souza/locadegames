import { describe, expect, it } from "vitest";
import { TICTACTOE_CONFIG } from "../src/shared/games/tictactoe/config";
import type { TicTacToeState } from "../src/shared/games/tictactoe/types";
import type { PlayerId } from "../src/shared/rooms/types";
import {
  claimTimeout,
  coinFlip,
  currentRound,
  findActiveMatch,
  finishLiveMatch,
  isLiveMatch,
  playMove,
  pointsOf,
  removePlayer,
  roundsFor,
  scoreLiveMatch,
  standings,
  startTournament,
  turnDeadline,
} from "../src/shared/tournament/tournament";
import { TOURNAMENT_CONFIG } from "../src/shared/tournament/config";
import type { Seed, Tournament } from "../src/shared/tournament/types";

const GAME = "tictactoe";
const SEED = 12345;
/** Seat 0 (X) wins on the top row. */
const X_WINS = [0, 3, 1, 4, 2];
/** Seat 1 (O) wins on the top row. */
const O_WINS = [3, 0, 4, 1, 8, 2];
/** Fills the board with no line: X O X / X O O / O X X. */
const DRAW = [0, 1, 2, 4, 3, 5, 7, 6, 8];

const pairsOf = (t: Tournament) => currentRound(t).matches.map((m) => [...m.players].sort());
const starters = (t: Tournament) => t.rounds.flatMap((r) => r.matches.map((m) => m.players[0]));

const seeds = (count: number, trophies: number[] = []): Seed[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, name: `P${i}`, trophies: trophies[i] ?? 0, joinOrder: i }));

/** Plays cells alternately in `playerId`'s match, starting with whoever's turn it is, each as soon as allowed. */
function playCells(t: Tournament, playerId: PlayerId, cells: number[]): Tournament {
  for (const cell of cells) {
    const match = findActiveMatch(t, playerId)!;
    const update = playMove(t, match.players[(match.game as TicTacToeState).turn], cell, match.turnStartedAt);
    if (!update.ok) throw new Error(update.error);
    t = update.tournament;
  }
  return t;
}

/** Plays every live match this round: seat 0 wins, or all draw. */
function playRound(t: Tournament, cells: number[]): Tournament {
  for (const match of currentRound(t).matches) t = playCells(t, match.players[0], cells);
  return t;
}

/** Plays every live match this round: the better seed (lower id here) wins, whoever starts. */
function seedsWinRound(t: Tournament): Tournament {
  for (const match of currentRound(t).matches) {
    t = playCells(t, match.players[0], match.players[0] < match.players[1] ? X_WINS : O_WINS);
  }
  return t;
}

describe("tournament", () => {
  it("plays enough rounds for a clear leader", () => {
    expect([2, 3, 4, 5, 8].map(roundsFor)).toEqual([1, 2, 2, 3, 3]);
  });

  it("pairs best seed against worst in round 1, and the bye goes to the lowest seed", () => {
    const even = startTournament(GAME, seeds(4), 0, SEED);
    expect(pairsOf(even)).toEqual([[0, 3], [1, 2]]);
    expect(currentRound(even).bye).toBeNull();
    const odd = startTournament(GAME, seeds(5, [0, 0, 0, 0, 3]), 0, SEED);
    expect(odd.entrants[0]!.id).toBe(4);
    expect(currentRound(odd).bye).toBe(3);
  });

  it("ends a 2-player draw with both sharing the title", () => {
    const t = playCells(startTournament(GAME, seeds(2), 0, SEED), 0, DRAW);
    expect(currentRound(t).matches[0]).toMatchObject({ result: "draw", winner: null });
    expect(t.finished).toBe(true);
    expect(t.championIds).toEqual([0, 1]);
    expect(standings(t).map((s) => [s.id, s.points, s.place])).toEqual([[0, 1, 1], [1, 1, 1]]);
  });

  it("pairs leaders with leaders, avoids rematches and crowns the top points", () => {
    let t = startTournament(GAME, seeds(4), 0, SEED);
    t = seedsWinRound(t); // 0 beats 3, 1 beats 2
    expect(t.rounds).toHaveLength(2);
    expect(pairsOf(t)).toEqual([[0, 1], [2, 3]]);
    t = playRound(t, X_WINS);
    expect(t.finished).toBe(true);
    const winner = currentRound(t).matches[0]!.winner!;
    expect(t.championIds).toEqual([winner]);
    expect(pointsOf(t, winner)).toBe(4);
  });

  it("starts later rounds together after a break, refusing moves until then", () => {
    let t = startTournament(GAME, seeds(4), 0, SEED);
    expect(currentRound(t).matches.every((m) => m.turnStartedAt === 0)).toBe(true);
    t = playRound(t, X_WINS);
    const [first, second] = currentRound(t).matches;
    const endedAt = 0;
    expect(first!.turnStartedAt).toBe(endedAt + TOURNAMENT_CONFIG.roundBreakMs);
    expect(second!.turnStartedAt).toBe(first!.turnStartedAt);
    const early = playMove(t, first!.players[0], 4, first!.turnStartedAt - 1);
    expect(early).toEqual({ ok: false, error: "TOO_EARLY" });
  });

  it("lets whoever started fewer games start the next one", () => {
    let t = startTournament(GAME, seeds(4), 0, SEED);
    t = playRound(t, X_WINS);
    for (const match of currentRound(t).matches) {
      const startedBefore = (id: PlayerId) => t.rounds[0]!.matches.some((m) => m.players[0] === id);
      const [first, second] = match.players;
      expect(startedBefore(first) && !startedBefore(second)).toBe(false);
    }
  });

  it("flips a coin for who starts when both have started as many games, never favouring the host", () => {
    // Player 0 is the best seed (the host when nobody has trophies). Over many tournaments, they start about half the time.
    const runs = 400;
    const hostStarts = Array.from({ length: runs }, (_, seed) => startTournament(GAME, seeds(2), 0, seed)).filter(
      (t) => starters(t)[0] === 0,
    ).length;
    expect(hostStarts).toBeGreaterThan(runs * 0.4);
    expect(hostStarts).toBeLessThan(runs * 0.6);
    // The same seed always gives the same seats (pure, so the server and tests agree).
    expect(starters(startTournament(GAME, seeds(4), 0, 7))).toEqual(starters(startTournament(GAME, seeds(4), 0, 7)));
    expect(new Set(Array.from({ length: 64 }, (_, i) => coinFlip(SEED, i))).size).toBe(2);
  });

  it("counts the bye as a win and never gives anyone two", () => {
    let t = startTournament(GAME, seeds(3), 0, SEED);
    expect(currentRound(t).bye).toBe(2);
    expect(pointsOf(t, 2)).toBe(2);
    t = playRound(t, X_WINS); // 0 v 1, the starter wins
    const loser = currentRound(t).bye;
    expect(loser).not.toBe(2);
    expect([...currentRound(t).matches[0]!.players].sort()).toEqual([0, 1].filter((id) => id !== loser).concat(2).sort());
  });

  it("forfeits a leaver's match, stops pairing them and keeps them out of the title", () => {
    let t = startTournament(GAME, seeds(4), 0, SEED);
    t = removePlayer(t, 3, 0);
    expect(currentRound(t).matches[0]).toMatchObject({ result: "forfeit", winner: 0 });
    t = playCells(t, 1, X_WINS);
    expect(t.rounds).toHaveLength(2);
    expect(currentRound(t).bye).toBe(2);
    expect(currentRound(t).matches.flatMap((m) => m.players)).not.toContain(3);
    expect(standings(t).at(-1)).toMatchObject({ id: 3, place: null });
  });

  it("plays the auto move only once the turn timer has run out", () => {
    let t = startTournament(GAME, seeds(2), 0, SEED);
    const matchId = currentRound(t).matches[0]!.id;
    expect(claimTimeout(t, matchId, TICTACTOE_CONFIG.turnTimeMs - 1, 0)).toEqual({ ok: false, error: "TOO_EARLY" });
    const update = claimTimeout(t, matchId, TICTACTOE_CONFIG.turnTimeMs, 0);
    if (!update.ok) throw new Error(update.error);
    t = update.tournament;
    expect((findActiveMatch(t, 0)!.game as TicTacToeState).board.filter((c) => c !== null)).toHaveLength(1);
  });

  it("rejects moves from players not in a live match", () => {
    const t = startTournament(GAME, seeds(3), 0, SEED);
    expect(playMove(t, 2, 4, 0)).toEqual({ ok: false, error: "NOT_IN_MATCH" });
  });

  describe("real-time games (Head Crash)", () => {
    const LIVE = "headcrash";

    it("starts every match at 0–0 with no turns: moves and timeouts are refused", () => {
      const t = startTournament(LIVE, seeds(4), 1_000, SEED);
      const matches = currentRound(t).matches;
      expect(matches).toHaveLength(2);
      for (const match of matches) {
        expect(isLiveMatch(match)).toBe(true);
        expect(match.game).toEqual({ score: [0, 0] });
        expect(turnDeadline(t, match)).toBe(Infinity);
        expect(playMove(t, match.players[0], 0, 2_000)).toEqual({ ok: false, error: "INVALID_MOVE" });
        expect(claimTimeout(t, match.id, 9_999_999, 0)).toEqual({ ok: false, error: "NOT_IN_MATCH" });
      }
    });

    it("keeps the score the server reports and moves on when it reports the end", () => {
      let t = startTournament(LIVE, seeds(4), 1_000, SEED);
      const [first, second] = currentRound(t).matches as [typeof t.rounds[0]["matches"][0], typeof t.rounds[0]["matches"][0]];
      t = scoreLiveMatch(t, first.id, [2, 1]);
      expect(currentRound(t).matches[0]!.game).toEqual({ score: [2, 1] });
      expect(currentRound(t).matches[0]!.result).toBeNull();

      t = finishLiveMatch(t, first.id, 1, [3, 5], 5_000);
      expect(t.rounds).toHaveLength(1);
      expect(t.rounds[0]!.matches[0]).toMatchObject({ result: "win", winner: first.players[1], game: { score: [3, 5] } });
      expect(pointsOf(t, first.players[1])).toBe(TOURNAMENT_CONFIG.winPoints);

      // The last match of the round: a draw, then the next round starts after the break.
      t = finishLiveMatch(t, second.id, null, [2, 2], 6_000);
      expect(t.rounds[0]!.matches[1]).toMatchObject({ result: "draw", winner: null });
      expect(pointsOf(t, second.players[0])).toBe(TOURNAMENT_CONFIG.drawPoints);
      expect(t.rounds).toHaveLength(2);
      expect(currentRound(t).matches.every((m) => m.turnStartedAt === 6_000 + TOURNAMENT_CONFIG.roundBreakMs && isLiveMatch(m))).toBe(true);

      // Reports for a match that is already over change nothing.
      expect(finishLiveMatch(t, first.id, 0, [5, 0], 7_000)).toBe(t);
      expect(scoreLiveMatch(t, first.id, [5, 0])).toBe(t);
    });

    it("a drawn 2-player match makes both champions; a quit gives the other the win", () => {
      const start = startTournament(LIVE, seeds(2), 1_000, SEED);
      const match = currentRound(start).matches[0]!;
      const drawn = finishLiveMatch(start, match.id, null, [1, 1], 2_000);
      expect(drawn.finished).toBe(true);
      expect([...drawn.championIds].sort()).toEqual([0, 1]);

      const quit = removePlayer(scoreLiveMatch(start, match.id, [4, 0]), match.players[0], 2_000);
      expect(quit.finished).toBe(true);
      expect(quit.championIds).toEqual([match.players[1]]);
      expect(currentRound(quit).matches[0]).toMatchObject({ result: "forfeit", game: { score: [4, 0] } });
    });
  });
});
