import { describe, expect, it } from "vitest";
import { TICTACTOE_CONFIG } from "../src/shared/games/tictactoe/config";
import type { PlayerId } from "../src/shared/rooms/types";
import {
  claimTimeout,
  currentRound,
  findActiveMatch,
  playMove,
  pointsOf,
  removePlayer,
  roundsFor,
  standings,
  startTournament,
} from "../src/shared/tournament/tournament";
import { TOURNAMENT_CONFIG } from "../src/shared/tournament/config";
import type { Seed, Tournament } from "../src/shared/tournament/types";

const GAME = "tictactoe";
/** Seat 0 (X) wins on the top row. */
const X_WINS = [0, 3, 1, 4, 2];
/** Fills the board with no line: X O X / X O O / O X X. */
const DRAW = [0, 1, 2, 4, 3, 5, 7, 6, 8];

const seeds = (count: number, trophies: number[] = []): Seed[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, name: `P${i}`, trophies: trophies[i] ?? 0, joinOrder: i }));

/** Plays cells alternately in `playerId`'s match, starting with whoever's turn it is, each as soon as allowed. */
function playCells(t: Tournament, playerId: PlayerId, cells: number[]): Tournament {
  for (const cell of cells) {
    const match = findActiveMatch(t, playerId)!;
    const update = playMove(t, match.players[match.game.turn], cell, match.turnStartedAt);
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

describe("tournament", () => {
  it("plays enough rounds for a clear leader", () => {
    expect([2, 3, 4, 5, 8].map(roundsFor)).toEqual([1, 2, 2, 3, 3]);
  });

  it("pairs best seed against worst in round 1, and the bye goes to the lowest seed", () => {
    const even = startTournament(GAME, seeds(4), 0);
    expect(currentRound(even).matches.map((m) => m.players)).toEqual([[0, 3], [1, 2]]);
    expect(currentRound(even).bye).toBeNull();
    const odd = startTournament(GAME, seeds(5, [0, 0, 0, 0, 3]), 0);
    expect(odd.entrants[0]!.id).toBe(4);
    expect(currentRound(odd).bye).toBe(3);
  });

  it("ends a 2-player draw with both sharing the title", () => {
    const t = playCells(startTournament(GAME, seeds(2), 0), 0, DRAW);
    expect(currentRound(t).matches[0]).toMatchObject({ result: "draw", winner: null });
    expect(t.finished).toBe(true);
    expect(t.championIds).toEqual([0, 1]);
    expect(standings(t).map((s) => [s.id, s.points, s.place])).toEqual([[0, 1, 1], [1, 1, 1]]);
  });

  it("pairs leaders with leaders, avoids rematches and crowns the top points", () => {
    let t = startTournament(GAME, seeds(4), 0);
    t = playRound(t, X_WINS); // 0 beats 3, 1 beats 2
    expect(t.rounds).toHaveLength(2);
    expect(currentRound(t).matches.map((m) => [...m.players].sort())).toEqual([[0, 1], [2, 3]]);
    t = playRound(t, X_WINS);
    expect(t.finished).toBe(true);
    const winner = currentRound(t).matches[0]!.winner!;
    expect(t.championIds).toEqual([winner]);
    expect(pointsOf(t, winner)).toBe(4);
  });

  it("starts later rounds together after a break, refusing moves until then", () => {
    let t = startTournament(GAME, seeds(4), 0);
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
    let t = startTournament(GAME, seeds(4), 0);
    t = playRound(t, X_WINS);
    // 0 and 1 both started in round 1; 0 is ranked higher, so 0 starts again. 2 started fewer than 3.
    expect(currentRound(t).matches.map((m) => m.players)).toEqual([[0, 1], [2, 3]]);
  });

  it("counts the bye as a win and never gives anyone two", () => {
    let t = startTournament(GAME, seeds(3), 0);
    expect(currentRound(t).bye).toBe(2);
    expect(pointsOf(t, 2)).toBe(2);
    t = playRound(t, X_WINS); // 0 beats 1
    expect(currentRound(t).bye).toBe(1);
    expect(currentRound(t).matches[0]!.players).toEqual([2, 0]);
  });

  it("forfeits a leaver's match, stops pairing them and keeps them out of the title", () => {
    let t = startTournament(GAME, seeds(4), 0);
    t = removePlayer(t, 3, 0);
    expect(currentRound(t).matches[0]).toMatchObject({ result: "forfeit", winner: 0 });
    t = playCells(t, 1, X_WINS);
    expect(t.rounds).toHaveLength(2);
    expect(currentRound(t).bye).toBe(2);
    expect(currentRound(t).matches.flatMap((m) => m.players)).not.toContain(3);
    expect(standings(t).at(-1)).toMatchObject({ id: 3, place: null });
  });

  it("plays the auto move only once the turn timer has run out", () => {
    let t = startTournament(GAME, seeds(2), 0);
    const matchId = currentRound(t).matches[0]!.id;
    expect(claimTimeout(t, matchId, TICTACTOE_CONFIG.turnTimeMs - 1)).toEqual({ ok: false, error: "TOO_EARLY" });
    const update = claimTimeout(t, matchId, TICTACTOE_CONFIG.turnTimeMs);
    if (!update.ok) throw new Error(update.error);
    t = update.tournament;
    expect(findActiveMatch(t, 0)!.game.board.filter((c) => c !== null)).toHaveLength(1);
  });

  it("rejects moves from players not in a live match", () => {
    const t = startTournament(GAME, seeds(3), 0);
    expect(playMove(t, 2, 4, 0)).toEqual({ ok: false, error: "NOT_IN_MATCH" });
  });
});
