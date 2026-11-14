import { describe, expect, it } from "vitest";
import { LADDERS, SNAKES, jumpFrom, squareCell } from "../src/shared/games/snakesladders/board";
import { SNAKESLADDERS_CONFIG, rollMs } from "../src/shared/games/snakesladders/config";
import { applyMove, createGame, dieFrom, finalPlaces, isIn, parseMove, quitSeat } from "../src/shared/games/snakesladders/rules";
import type { SnakesLaddersState } from "../src/shared/games/snakesladders/types";
import { claimPartyTimeout, partyDeadline, playPartyMove, quitParty, startParty } from "../src/shared/party/party";
import { rollCues } from "../src/web/games/snakesladders/rollCues";

/** Rolls `die` for whoever's turn it is; fails the test if refused. */
function roll(state: SnakesLaddersState, die: number): SnakesLaddersState {
  const result = applyMove(state, state.turn, die);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** A game of `players` with pieces already on `positions` (seat 0 to roll). */
function at(positions: number[]): SnakesLaddersState {
  return { ...createGame(positions.length), positions, turnFrom: positions[0]! };
}

describe("snakes & ladders board", () => {
  it("winds up from the bottom-left, and no snake or ladder ends where another starts", () => {
    const starts = [...Object.keys(LADDERS), ...Object.keys(SNAKES)].map(Number);
    const ends = [...Object.values(LADDERS), ...Object.values(SNAKES)];
    expect({
      cells: [1, 10, 11, 20, 21, 100].map(squareCell),
      overlap: ends.filter((end) => starts.includes(end)),
      inside: [...starts, ...ends].every((square) => square > 1 && square < SNAKESLADDERS_CONFIG.finish),
      upAndDown: [...Object.entries(LADDERS).map(([foot, top]) => top > Number(foot)), ...Object.entries(SNAKES).map(([head, tail]) => tail < Number(head))],
      jumps: [jumpFrom(3), jumpFrom(24), jumpFrom(5)],
    }).toEqual({
      cells: [{ col: 0, row: 0 }, { col: 9, row: 0 }, { col: 9, row: 1 }, { col: 0, row: 1 }, { col: 0, row: 2 }, { col: 0, row: 9 }],
      overlap: [],
      inside: true,
      upAndDown: Array<boolean>(starts.length).fill(true),
      jumps: [LADDERS[3], SNAKES[24], 5],
    });
  });
});

describe("snakes & ladders rules", () => {
  it("starts off the board, climbs ladders, slides down snakes, and landing on someone does nothing", () => {
    let g = createGame(2);
    g = roll(g, 2); // seat 0: onto 2
    g = roll(g, 3); // seat 1: the ladder at 3
    const afterLadder = g.lastRoll;
    g = roll(g, 4); // seat 0: 2 → 6
    g = roll(g, 2); // seat 1: 23 → 25
    const shared = at([21, 24]);
    const snake = roll(shared, 3); // seat 0: onto 24, a snake's head, even with someone there
    expect({
      positions: g.positions,
      afterLadder,
      snake: snake.lastRoll,
      other: snake.positions[1],
    }).toEqual({
      positions: [6, 25],
      afterLadder: { seat: 1, die: 3, from: 0, landed: 3, to: LADDERS[3], kind: "ladder", again: false, finished: false },
      snake: { seat: 0, die: 3, from: 21, landed: 24, to: SNAKES[24], kind: "snake", again: false, finished: false },
      other: 24,
    });
  });

  it("needs the exact roll to finish: one too many and you stay where you are", () => {
    const stuck = roll(at([97, 0]), 5);
    const done = roll(at([97, 0, 0]), 3);
    expect({ stuck: [stuck.positions[0], stuck.lastRoll!.kind, stuck.turn], done: [done.positions[0], done.finishOrder, done.lastRoll!.finished, done.turn] }).toEqual({
      stuck: [97, "stuck", 1],
      done: [100, [0], true, 1],
    });
  });

  it("rolls again on a 6, even when it doesn't move you; three 6s in a row put you back where the turn began", () => {
    let g = at([30, 0]);
    g = roll(g, 6); // 36: up the ladder to 64
    const again = [g.turn, g.sixes, g.positions[0], g.lastRoll!.again];
    g = roll(g, 6); // 70
    g = roll(g, 6); // the third: back to 30
    const back = [g.turn, g.positions[0], g.lastRoll!.kind, g.lastRoll!.to, g.lastRoll!.again];
    const stuckSix = roll(at([96, 0]), 6);
    const finishSix = roll(at([94, 0, 0]), 6);
    expect({ again, back, stuckSix: [stuckSix.turn, stuckSix.lastRoll!.kind], finishSix: [finishSix.turn, finishSix.lastRoll!.again] }).toEqual({
      again: [0, 1, LADDERS[36], true],
      back: [1, 30, "threeSixes", 30, false],
      stuckSix: [0, "stuck"],
      finishSix: [1, false],
    });
  });

  it("goes on until everyone but one has finished: places in the order they got home, the last one after them", () => {
    let g = at([99, 99, 99, 50]);
    g = roll(g, 1); // seat 0 home: 1st
    const goesOn = [g.over, g.turn];
    g = roll(g, 1); // seat 1 home: 2nd
    g = roll(g, 1); // seat 2 home: 3rd, only seat 3 left
    expect({ goesOn, over: g.over, turn: g.turn, places: finalPlaces(g) }).toEqual({
      goesOn: [false, 1],
      over: true,
      turn: -1,
      places: [
        { seat: 0, place: 1, quit: false },
        { seat: 1, place: 2, quit: false },
        { seat: 2, place: 3, quit: false },
        { seat: 3, place: 4, quit: false },
      ],
    });
  });

  it("puts quitters below everyone (the latest quit higher), passes their turn on, and ends once one is left", () => {
    let g = at([99, 10, 20, 30]);
    g = quitSeat(g, 0); // their own turn: it passes on
    const passed = [g.turn, isIn(g, 0)];
    g = quitSeat(g, 2);
    g = roll(g, 1); // seat 1: 11
    g = quitSeat(g, 3); // only seat 1 left: over
    expect({ passed, over: g.over, places: finalPlaces(g).map((p) => [p.seat, p.place, p.quit]) }).toEqual({
      passed: [1, false],
      over: true,
      places: [
        [1, 1, false],
        [3, 2, true],
        [2, 3, true],
        [0, 4, true],
      ],
    });
  });

  it("refuses rolls out of turn and after the end; reads only a roll (a chosen die only on a dev server)", () => {
    const g = createGame(2);
    expect({
      outOfTurn: applyMove(g, 1, 3),
      badDie: applyMove(g, 0, 7),
      over: applyMove({ ...g, over: true }, 0, 3),
      moves: [parseMove("roll"), parseMove({ die: 6 }), parseMove({ die: 6 }, true), parseMove({ die: 9 }, true), parseMove(3)],
      dice: [0, 1, 5, 6, 4_294_967_295].map(dieFrom),
    }).toEqual({
      outOfTurn: { ok: false, error: "NOT_YOUR_TURN" },
      badDie: { ok: false, error: "INVALID_MOVE" },
      over: { ok: false, error: "GAME_OVER" },
      moves: [{ die: null }, null, { die: 6 }, null, null],
      dice: [1, 2, 6, 1, 4],
    });
  });

  it("times each roll on screen: the die and a beat, a hop per square, then the ladder or snake", () => {
    const { hopMs, climbMs, slideMs, stuckMs, backMs } = SNAKESLADDERS_CONFIG;
    const dieMs = SNAKESLADDERS_CONFIG.dieMs + SNAKESLADDERS_CONFIG.settleMs;
    const base = { seat: 0, die: 2, from: 0, landed: 2, to: 23, again: false, finished: false };
    expect([
      rollMs({ ...base, kind: "ladder" }),
      rollMs({ ...base, kind: "move", to: 2 }),
      rollMs({ ...base, kind: "snake", from: 14, landed: 17, to: 7 }),
      rollMs({ ...base, kind: "stuck" }),
      rollMs({ ...base, kind: "threeSixes" }),
    ]).toEqual([dieMs + 2 * hopMs + climbMs, dieMs + 2 * hopMs, dieMs + 3 * hopMs + slideMs, dieMs + stuckMs, dieMs + backMs]);
  });
});

describe("snakes & ladders party", () => {
  const players = [0, 1, 2].map((id) => ({ id, name: `P${id}`, firsts: 0 }));

  it("rolls the server's die, starts the next clock once the roll has played out, and rolls for you when time runs out", () => {
    const party = startParty("snakesladders", players.slice(0, 2), 0, 3);
    const [first, second] = party.entrants.map((e) => e.id) as [number, number];
    const loaded = playPartyMove(party, first, { die: 6 }, 1_000, 0);
    const moved = playPartyMove(party, first, "roll", 1_000, 1); // seed 1: a 2
    if (!moved.ok) throw new Error(moved.error);
    const timedOut = claimPartyTimeout(moved.party, moved.party.game.moves, partyDeadline(moved.party), 2); // a 3: the ladder
    if (!timedOut.ok) throw new Error(timedOut.error);
    expect({
      loaded,
      outOfTurn: playPartyMove(party, second, "roll", 1_000, 1),
      positions: moved.party.game.positions,
      clock: moved.party.turnStartedAt,
      early: claimPartyTimeout(moved.party, moved.party.game.moves, partyDeadline(moved.party) - 1, 2).ok,
      afterTimeout: timedOut.party.game.positions,
    }).toEqual({
      loaded: { ok: false, error: "INVALID_MOVE" },
      outOfTurn: { ok: false, error: "NOT_YOUR_TURN" },
      positions: [2, 0],
      clock: 1_000 + rollMs(moved.party.game.lastRoll!),
      early: false,
      afterTimeout: [2, LADDERS[3]],
    });
  });

  it("finishes with the first one home as champion and everyone ranked; a quitter last", () => {
    let party = startParty("snakesladders", players, 0, 7);
    party = { ...party, game: { ...party.game, positions: [99, 99, 40], turnFrom: 99 } };
    const ids = party.entrants.map((e) => e.id) as [number, number, number];
    const home = playPartyMove(party, ids[0], { die: 1 }, 10, 0, true);
    if (!home.ok) throw new Error(home.error);
    const quit = quitParty(home.party, ids[2], 20);
    if (!quit.ok) throw new Error(quit.error);
    expect({ finished: quit.party.finished, champions: quit.party.championIds, results: quit.party.results }).toEqual({
      finished: true,
      champions: [ids[0]],
      results: [
        { id: ids[0], place: 1, quit: false },
        { id: ids[1], place: 2, quit: false },
        { id: ids[2], place: 3, quit: true },
      ],
    });
  });
});

describe("snakes & ladders cues", () => {
  it("times a roll's sounds to its playback; only your own roll is felt", () => {
    const { hopMs } = SNAKESLADDERS_CONFIG;
    const dieMs = SNAKESLADDERS_CONFIG.dieMs + SNAKESLADDERS_CONFIG.settleMs;
    const ladder = { seat: 0, die: 3, from: 0, landed: 3, to: 23, kind: "ladder", again: false, finished: false } as const;
    const home = { seat: 1, die: 6, from: 94, landed: 100, to: 100, kind: "move", again: false, finished: true } as const;
    const mine = rollCues(ladder, "mine", 4);
    expect({
      sounds: mine.sounds.map((s) => [s.sound, s.at]),
      felt: mine.haptics.map((h) => h.haptic),
      theirs: rollCues(ladder, "theirs", 4).haptics,
      home: rollCues(home, "watching", 2).sounds.at(-1),
    }).toEqual({
      sounds: [
        ["snakesLaddersDieRoll", 0],
        ["snakesLaddersHop", dieMs + 0.78 * hopMs],
        ["snakesLaddersHop", dieMs + 1.78 * hopMs],
        ["snakesLaddersHop", dieMs + 2.78 * hopMs],
        ["snakesLaddersLadder", dieMs + 3 * hopMs],
      ],
      felt: ["snakesLaddersDieLands", "snakesLaddersLadder"],
      theirs: [],
      home: { sound: "snakesLaddersHome", at: rollMs(home), variant: 2, volume: 0.65 },
    });
  });
});
