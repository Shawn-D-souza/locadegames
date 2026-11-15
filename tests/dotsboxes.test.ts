import { describe, expect, it } from "vitest";
import { boxesBeside, lineAt, lineCount, sidesOf } from "../src/shared/games/dotsboxes/board";
import { boardSizeFor, DOTSBOXES_CONFIG, lineMs } from "../src/shared/games/dotsboxes/config";
import { applyMove, autoMove, boxesHandedOver, boxesOf, canDraw, createGame, finalPlaces, quitSeat, winners } from "../src/shared/games/dotsboxes/rules";
import type { DotsBoxesState } from "../src/shared/games/dotsboxes/types";
import { claimPartyTimeout, partyDeadline, playPartyMove, quitParty, startParty } from "../src/shared/party/party";

/** Draws these lines, whoever's turn it is. */
function play(state: DotsBoxesState, lines: number[]): DotsBoxesState {
  let next = state;
  for (const line of lines) {
    const result = applyMove(next, next.turn, line);
    if (!result.ok) throw new Error(`${line}: ${result.error}`);
    next = result.state;
  }
  return next;
}

/** A game with these lines already drawn (nobody's boxes), seat 0 to move. */
function withLines(players: number, lines: number[]): DotsBoxesState {
  const state = createGame(players);
  return { ...state, drawn: state.drawn.map((_, line) => lines.includes(line)) };
}

describe("dots & boxes board", () => {
  it("grows with the players: 2 → 5×5, 3–4 → 6×6, 5–6 → 7×7, 7–8 → 8×8", () => {
    expect([2, 3, 4, 5, 6, 7, 8].map(boardSizeFor)).toEqual([5, 6, 6, 7, 7, 8, 8]);
  });

  it("numbers lines horizontal first, then vertical, and knows each box's sides", () => {
    // 5×5: 30 horizontal lines, then 30 vertical.
    expect([lineCount(5), lineAt(5, 6), lineAt(5, 30), lineAt(5, 59)]).toEqual([
      60,
      { horizontal: true, row: 1, col: 1 },
      { horizontal: false, row: 0, col: 0 },
      { horizontal: false, row: 4, col: 5 },
    ]);
    expect([sidesOf(5, 0), sidesOf(5, 24), boxesBeside(5, 0), boxesBeside(5, 5), boxesBeside(5, 31)]).toEqual([
      [0, 31, 5, 30],
      [24, 59, 29, 58],
      [0],
      [0, 5],
      [0, 1],
    ]);
  });
});

describe("dots & boxes rules", () => {
  it("passes the turn after a line that wins nothing, in turn order round every player", () => {
    const state = play(createGame(3), [0, 1, 2]);
    expect([state.turn, state.moves, state.lastMove]).toEqual([0, 3, { seat: 2, line: 2, boxes: [] }]);
  });

  it("refuses a drawn line, someone else's turn, and a line off the board", () => {
    const state = play(createGame(2), [0]);
    expect([applyMove(state, 1, 0), applyMove(state, 0, 1), applyMove(state, 1, 60), canDraw(state, 1, 1)]).toEqual([
      { ok: false, error: "CELL_TAKEN" },
      { ok: false, error: "NOT_YOUR_TURN" },
      { ok: false, error: "INVALID_MOVE" },
      true,
    ]);
  });

  it("gives a box to whoever draws its fourth side, and they draw again", () => {
    // Box 0 of a 6×6 board (3 players): top 0, left 42, bottom 6 by three players in turn; seat 0 closes it with 43.
    const state = play(createGame(3), [0, 42, 6, 43]);
    expect([state.boxes[0], state.turn, state.lastMove?.boxes, boxesOf(state, 0)]).toEqual([0, 0, [0], 1]);
  });

  it("wins both boxes when one line closes two at once", () => {
    // Boxes 0 and 1 with every side but the line between them (31).
    const state = applyMove(withLines(2, [0, 1, 5, 6, 30, 32]), 0, 31);
    expect(state.ok && [state.state.boxes[0], state.state.boxes[1], state.state.lastMove?.boxes, state.state.turn]).toEqual([0, 0, [0, 1], 0]);
  });

  it("ends once every line is drawn; most boxes wins, and a tie shares the win", () => {
    const size = boardSizeFor(2);
    let state = createGame(2);
    while (!state.over) state = play(state, [autoMove(state)]);
    const total = boxesOf(state, 0) + boxesOf(state, 1);
    // Every box handed out, the turn gone, and the winner (or both) has the most.
    const level = { ...state, boxes: state.boxes.map((_, box) => box % 2) };
    expect([total, state.turn, state.drawn.every(Boolean), winners(state).every((seat) => boxesOf(state, seat) >= total / 2)]).toEqual([size * size, -1, true, true]);
    // 25 boxes can't split evenly; 3 players on 36 can, 12 each.
    const three = { ...createGame(3), over: true, boxes: Array.from({ length: 36 }, (_, box) => box % 3) };
    expect([winners(three), finalPlaces(three).map((p) => p.place), winners({ ...level, boxes: level.boxes.map((s) => (s === 1 ? 0 : s)) })]).toEqual([
      [0, 1, 2],
      [1, 1, 1],
      [0],
    ]);
  });

  it("ranks by boxes, level players sharing a place, quitters last (the last to quit first)", () => {
    const state: DotsBoxesState = { ...createGame(5), over: true, boxes: [0, 0, 1, 1, 2, 4, 4, 4, ...Array<null>(41).fill(null)], quit: [false, false, false, true, true], quitOrder: [4, 3] };
    expect(finalPlaces(state)).toEqual([
      { seat: 0, place: 1, quit: false, score: 2 },
      { seat: 1, place: 1, quit: false, score: 2 },
      { seat: 2, place: 3, quit: false, score: 1 },
      { seat: 3, place: 4, quit: true, score: 0 },
      { seat: 4, place: 5, quit: true, score: 3 },
    ]);
  });

  it("skips a quitter, keeps their boxes, and ends when only one player is left (they win)", () => {
    let state = play(createGame(3), [0, 42, 6, 43]);
    state = quitSeat(state, 1);
    // Seat 0 draws again (they won box 0), then the turn skips seat 1.
    state = play(state, [10]);
    expect([state.turn, state.boxes[0]]).toEqual([2, 0]);
    state = quitSeat(state, 2);
    expect([state.over, winners(state), finalPlaces(state).map((p) => [p.seat, p.place, p.quit])]).toEqual([
      true,
      [0],
      [
        [0, 1, false],
        [2, 2, true],
        [1, 3, true],
      ],
    ]);
  });

  it("a quit on your own turn hands it on at once", () => {
    const state = quitSeat(createGame(3), 0);
    expect([state.turn, state.over]).toEqual([1, false]);
  });
});

describe("dots & boxes auto move", () => {
  it("takes the most boxes on offer", () => {
    // Box 0 has three sides; boxes 2 and 3 share their open line 33.
    expect(autoMove(withLines(2, [0, 30, 5, 2, 3, 7, 8, 32, 34]))).toBe(33);
  });

  it("else draws the first line that gives nobody a box", () => {
    // Line 0 would give box 0 its third side (30 and 5 drawn); line 1 is safe.
    expect(autoMove(withLines(2, [30, 5]))).toBe(1);
  });

  it("else hands over the fewest boxes", () => {
    // Played out by auto moves until no line is safe and none wins a box: then its line hands over the fewest.
    // A few scattered lines first, so the chains left at the end differ in length.
    let state = play(createGame(2), [33, 12, 47, 20, 55, 3, 38, 26]);
    const open = () => state.drawn.flatMap((d, line) => (d ? [] : [line]));
    const wins = (line: number) => boxesBeside(state.size, line).some((box) => sidesOf(state.size, box).filter((side) => side !== line && state.drawn[side]).length === 3);
    const safe = (line: number) => boxesBeside(state.size, line).every((box) => sidesOf(state.size, box).filter((side) => state.drawn[side]).length < 2);
    while (open().some((line) => wins(line) || safe(line))) state = play(state, [autoMove(state)]);
    const given = open().map((line) => boxesHandedOver(state.size, state.drawn, line));
    const chosen = boxesHandedOver(state.size, state.drawn, autoMove(state));
    expect([chosen, new Set(given).size > 1]).toEqual([Math.min(...given), true]);
  });
});

describe("dots & boxes in the party format", () => {
  it("starts the next line's clock once the line (and any box) has drawn in, and a timeout draws for you", () => {
    let party = startParty("dotsboxes", [{ id: 0, name: "Ana", firsts: 0 }, { id: 1, name: "Ben", firsts: 0 }], 1_000, 7);
    const first = party.entrants[0]!.id;
    const moved = playPartyMove(party, first, 0, 2_000, 0);
    if (!moved.ok) throw new Error(moved.error);
    party = moved.party;
    const late = claimPartyTimeout(party, party.game.moves, partyDeadline(party), 0);
    expect([party.turnStartedAt, lineMs(1), late.ok && late.party.game.moves]).toEqual([2_000 + DOTSBOXES_CONFIG.lineMs, DOTSBOXES_CONFIG.lineMs + DOTSBOXES_CONFIG.boxMs, 2]);
  });

  it("a quit leaving one player ends the game with them as champion and everyone's boxes on the results", () => {
    const party = startParty("dotsboxes", [{ id: 0, name: "Ana", firsts: 0 }, { id: 1, name: "Ben", firsts: 0 }], 1_000, 7);
    const quitter = party.entrants[1]!.id;
    const done = quitParty(party, quitter, 2_000);
    expect(done.ok && [done.party.finished, done.party.championIds, done.party.results.map((r) => [r.id, r.place, r.quit, r.score])]).toEqual([
      true,
      [party.entrants[0]!.id],
      [
        [party.entrants[0]!.id, 1, false, 0],
        [quitter, 2, true, 0],
      ],
    ]);
  });
});
