import { describe, expect, it } from "vitest";
import { CELL_COUNT, FOURINAROW_CONFIG } from "../src/shared/games/fourinarow/config";
import { fourInARowGame } from "../src/shared/games/fourinarow/game";
import { applyMove, cellAt, createGame, landingRow, leftmostOpenColumn } from "../src/shared/games/fourinarow/rules";
import type { FourInARowState, Seat } from "../src/shared/games/fourinarow/types";
import { seededRandom } from "../src/shared/random";
import { durations } from "../src/theme";
import { isRinged } from "../src/web/games/fourinarow/discMark";
import { fallMs } from "../src/web/games/fourinarow/drop";
import { lastDiscSound } from "../src/web/games/fourinarow/sounds";

const { columns, rows } = FOURINAROW_CONFIG;

/** Drops discs in these columns, whoever's turn it is. */
function play(moves: number[], first: Seat = 0): FourInARowState {
  let state = createGame(first);
  for (const column of moves) {
    const result = applyMove(state, state.turn, column);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
}

const bottom = rows - 1;

describe("4 in a Row rules", () => {
  it("drops a disc to the lowest empty hole and alternates turns, never mutating the input", () => {
    const start = createGame(1);
    const one = play([3], 1);
    const two = play([3, 3], 1);
    expect([start.cells.every((c) => c === null), one.cells[cellAt(bottom, 3)], one.turn, two.cells[cellAt(bottom - 1, 3)], two.lastMove]).toEqual([
      true,
      1,
      0,
      0,
      cellAt(bottom - 1, 3),
    ]);
  });

  it("wins across, down and on both diagonals, with the run end to end", () => {
    const across = play([0, 0, 1, 1, 2, 2, 3]);
    const down = play([5, 6, 5, 6, 5, 6, 5]);
    // First player climbs to the right: columns 0..3 at heights 1..4.
    const rising = play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    // Second player falls to the right: columns 3..6 at heights 4..1.
    const falling = play([6, 5, 5, 4, 3, 4, 4, 3, 0, 3, 3], 1);
    expect([across.winner, across.winningLine]).toEqual([0, [cellAt(bottom, 0), cellAt(bottom, 1), cellAt(bottom, 2), cellAt(bottom, 3)]]);
    expect([down.winner, down.winningLine?.length]).toEqual([0, 4]);
    expect([rising.winner, rising.winningLine]).toEqual([0, [cellAt(bottom - 3, 3), cellAt(bottom - 2, 2), cellAt(bottom - 1, 1), cellAt(bottom, 0)]]);
    expect([falling.winner, falling.winningLine]).toEqual([1, [cellAt(bottom - 3, 3), cellAt(bottom - 2, 4), cellAt(bottom - 1, 5), cellAt(bottom, 6)]]);
  });

  it("a disc joining two runs wins with the whole run", () => {
    const state = play([0, 0, 1, 1, 3, 3, 4, 4, 2]);
    expect([state.winner, state.winningLine?.length]).toEqual([0, 5]);
  });

  it("a full board with no line is a draw", () => {
    // Columns filled in pairs so no four ever line up: 0,1 then 2,3 then 4,5 shifted, and 6 last.
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6];
    const state = play(order);
    expect([state.isDraw, state.winner, state.cells.every((c) => c !== null)]).toEqual([true, null, true]);
  });

  it("refuses moves out of turn, off the board, into a full column or after the end", () => {
    const full = play([2, 2, 2, 2, 2, 2]);
    const won = play([0, 0, 1, 1, 2, 2, 3]);
    expect([
      applyMove(full, 1, 0),
      applyMove(full, 0, 7),
      applyMove(full, 0, -1),
      applyMove(full, 0, 1.5),
      applyMove(full, 0, 2),
      applyMove(won, 1, 6),
    ]).toEqual([
      { ok: false, error: "NOT_YOUR_TURN" },
      { ok: false, error: "INVALID_MOVE" },
      { ok: false, error: "INVALID_MOVE" },
      { ok: false, error: "INVALID_MOVE" },
      { ok: false, error: "CELL_TAKEN" },
      { ok: false, error: "GAME_OVER" },
    ]);
  });

  it("a timeout drops in the leftmost column with room", () => {
    expect([leftmostOpenColumn(createGame(0)), leftmostOpenColumn(play([0, 0, 0, 0, 0, 0])), fourInARowGame.parseMove(3), fourInARowGame.parseMove("3")]).toEqual([0, 1, 3, null]);
  });

  it("random whole games stay legal and end in a win or a full board", () => {
    const random = seededRandom(7);
    const problems: string[] = [];
    for (let game = 0; game < 200; game++) {
      let state = createGame(game % 2 === 0 ? 0 : 1);
      while (fourInARowGame.outcome(state).kind === "playing") {
        const open = Array.from({ length: columns }, (_, c) => c).filter((c) => landingRow(state.cells, c) !== null);
        const result = applyMove(state, state.turn, open[Math.floor(random() * open.length)]!);
        if (!result.ok) problems.push(`game ${game}: ${result.error}`);
        else state = result.state;
        if (!result.ok) break;
      }
      const discs = state.cells.filter((c) => c !== null).length;
      if (state.winner === null && discs !== CELL_COUNT) problems.push(`game ${game} ended early`);
      // Discs only ever rest on the bottom or on another disc.
      for (let cell = 0; cell < CELL_COUNT - columns; cell++) if (state.cells[cell] !== null && state.cells[cell + columns] === null) problems.push(`game ${game}: floating disc`);
    }
    expect(problems).toEqual([]);
  });
});

describe("4 in a Row on screen", () => {
  it("a disc falls longer the further it drops, and every landing is down before the ending's thump", () => {
    const times = Array.from({ length: rows }, (_, row) => fallMs(row));
    expect([times.every((t, i) => i === 0 || t > times[i - 1]!), times.at(-1), times.every((t) => t < durations.slow)]).toEqual([true, durations.discFall, true]);
  });

  it("your own discs are the ringed ones (watching, the second seat's), and sound so; the take is the row it landed on", () => {
    expect([
      lastDiscSound(createGame(0), 0),
      lastDiscSound(play([4]), 0),
      lastDiscSound(play([4]), 1),
      lastDiscSound(play([4, 4]), null),
      [isRinged(0, 0), isRinged(1, 0), isRinged(0, null), isRinged(1, null)],
    ]).toEqual([
      null,
      { sound: "fourInARowRingedDiscLands", variant: bottom },
      { sound: "fourInARowDiscLands", variant: bottom },
      { sound: "fourInARowRingedDiscLands", variant: bottom - 1 },
      [true, false, false, true],
    ]);
  });
});
