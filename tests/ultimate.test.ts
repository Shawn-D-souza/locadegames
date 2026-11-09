import { describe, expect, it } from "vitest";
import { ultimateGame } from "../src/shared/games/ultimate/game";
import { applyMove, boardOf, createGame, isPlayableBoard, judgeBoard, smallCells, smallWinningLine } from "../src/shared/games/ultimate/rules";
import type { Seat, UltimateState } from "../src/shared/games/ultimate/types";
import { lastMarkSound } from "../src/web/games/ultimate/sounds";
import { CLAIM_SOUND_AT, ultimateMoveSteps } from "../src/web/games/ultimate/ultimateCues";

/** Cell number from (small board, place in it). */
const at = (board: number, place: number) => board * 9 + place;

function play(moves: number[], from: UltimateState = createGame(0)): UltimateState {
  let state = from;
  for (const cell of moves) {
    const result = applyMove(state, state.turn, cell);
    if (!result.ok) throw new Error(`${cell}: ${result.error}`);
    state = result.state;
  }
  return state;
}

/** A position set up directly: these marks, small boards judged from them, `turn` to move in board `next`. */
function position(marks: [cell: number, seat: Seat][], turn: Seat, next: number | null): UltimateState {
  const cells = createGame(0).cells;
  for (const [cell, seat] of marks) cells[cell] = seat;
  const boards = Array.from({ length: 9 }, (_, board) => judgeBoard(smallCells(cells, board)));
  return { ...createGame(turn), cells, boards, next };
}

/** X takes the top-left small board along its top row while O answers in boards 1 and 2; X's last move sends O to board 0, now closed. */
const X_TAKES_BOARD_0 = [at(0, 1), at(1, 0), at(0, 2), at(2, 0), at(0, 0)];

describe("ultimate tic-tac-toe rules", () => {
  it("starts empty, any board open, with the given player", () => {
    const start = createGame(1);
    expect(start.cells).toHaveLength(81);
    expect(start.boards).toEqual(Array(9).fill(null));
    expect(start.next).toBeNull();
    expect(start.turn).toBe(1);
  });

  it("sends the other player to the small board matching the cell played, never mutating the input", () => {
    const start = createGame(0);
    const result = applyMove(start, 0, at(4, 2));
    if (!result.ok) throw new Error(result.error);
    expect(result.state.next).toBe(2);
    expect(result.state.turn).toBe(1);
    expect(start.cells[at(4, 2)]).toBeNull();
    expect(applyMove(result.state, 1, at(5, 0))).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(result.state, 1, at(2, 0)).ok).toBe(true);
  });

  it("closes a small board once it is won, for the player who won it", () => {
    const state = play(X_TAKES_BOARD_0);
    expect(state.boards[0]).toBe(0);
    expect(smallWinningLine(state, 0)).toEqual([0, 1, 2]);
    expect(smallWinningLine(state, 1)).toBeNull();
    expect(state.winner).toBeNull();
  });

  it("lets you play in any open board when sent to a closed one, but never into a closed one", () => {
    const state = play(X_TAKES_BOARD_0);
    expect(state.next).toBeNull();
    expect(isPlayableBoard(state, 0)).toBe(false);
    expect(isPlayableBoard(state, 8)).toBe(true);
    expect(applyMove(state, 1, at(0, 4))).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(state, 1, at(8, 8)).ok).toBe(true);
  });

  it("counts a full small board with no line for nobody", () => {
    // Board 4: X O X / X O O / O X _, and X fills the last cell: no line.
    const pattern: Seat[] = [0, 1, 0, 0, 1, 1, 1, 0];
    const state = position(pattern.map((seat, place) => [at(4, place), seat]), 0, 4);
    expect(state.boards[4]).toBeNull();
    const after = play([at(4, 8)], state);
    expect(after.boards[4]).toBe("draw");
    expect(after.next).toBe(8);
    expect(isPlayableBoard({ ...after, next: null }, 4)).toBe(false);
  });

  it("wins with three small boards in a row", () => {
    // X has boards 0 and 3 (top rows) and two of board 6's top row; X is sent to board 6.
    const state = position(
      [
        ...[0, 1, 2].flatMap((place): [number, Seat][] => [[at(0, place), 0], [at(3, place), 0]]),
        [at(6, 0), 0],
        [at(6, 1), 0],
        [at(1, 4), 1],
        [at(2, 4), 1],
      ],
      0,
      6,
    );
    const won = play([at(6, 2)], state);
    expect(won.boards[6]).toBe(0);
    expect(won.winner).toBe(0);
    expect(won.winningLine).toEqual([0, 3, 6]);
    expect(ultimateGame.outcome(won)).toEqual({ kind: "win", seat: 0 });
    expect(applyMove(won, 1, at(8, 8))).toEqual({ ok: false, error: "GAME_OVER" });
  });

  it("is a draw when every small board is closed with no line of three", () => {
    // Small boards won X O X / X O O / O X X (no line of three); the last move takes board 8 for X.
    const owners: Seat[] = [0, 1, 0, 0, 1, 1, 1, 0];
    const state = position(
      [...owners.flatMap((seat, board) => [0, 1, 2].map((place): [number, Seat] => [at(board, place), seat])), [at(8, 0), 0], [at(8, 1), 0]],
      0,
      8,
    );
    const after = play([at(8, 2)], state);
    expect(after.boards[8]).toBe(0);
    expect(after.isDraw).toBe(true);
    expect(after.winner).toBeNull();
    expect(ultimateGame.outcome(after)).toEqual({ kind: "draw" });
  });

  it("rejects illegal moves", () => {
    const state = play([at(4, 4)]);
    expect(applyMove(state, 0, at(4, 0))).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    expect(applyMove(state, 1, at(4, 4))).toEqual({ ok: false, error: "CELL_TAKEN" });
    expect(applyMove(state, 1, 81)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(state, 1, -1)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(state, 1, 1.5)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(ultimateGame.parseMove("4")).toBeNull();
    expect(ultimateGame.parseMove(40)).toBe(40);
  });

  it("plays the first empty cell you may play in when time runs out", () => {
    expect(ultimateGame.autoMove(createGame(0))).toBe(0);
    // Sent to board 2: its first empty cell.
    expect(ultimateGame.autoMove(play([at(4, 2)]))).toBe(at(2, 0));
    // Sent to closed board 0, so anywhere: board 1's first empty cell (its first is O's).
    expect(ultimateGame.autoMove(play(X_TAKES_BOARD_0))).toBe(at(1, 1));
  });

  it("keeps every game legal to the end, auto moves or random ones", () => {
    let seed = 7;
    const random = () => ((seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0) / 2 ** 32);
    for (let game = 0; game < 60; game++) {
      let state = createGame(game % 2 === 0 ? 0 : 1);
      while (ultimateGame.outcome(state).kind === "playing") {
        const legal = state.cells.flatMap((value, cell) => (value === null && isPlayableBoard(state, boardOf(cell)) ? [cell] : []));
        expect(legal.length).toBeGreaterThan(0);
        const cell = game < 10 ? ultimateGame.autoMove(state) : legal[Math.floor(random() * legal.length)]!;
        expect(legal).toContain(cell);
        state = play([cell], state);
        if (state.next !== null) expect(state.boards[state.next]).toBeNull();
        state.boards.forEach((board, index) => expect(board).toBe(judgeBoard(smallCells(state.cells, index))));
      }
    }
  });
});

describe("ultimate tic-tac-toe sounds", () => {
  it("climbs with how full the small board is", () => {
    expect(lastMarkSound(createGame(0))).toBeNull();
    expect(lastMarkSound(play([at(4, 4)]))).toEqual({ sound: "ultimateMarkX", variant: 0 });
    expect(lastMarkSound(play([at(4, 4), at(4, 0)]))).toEqual({ sound: "ultimateMarkO", variant: 1 });
  });

  it("stamps a won board on after its mark, yours or someone else's", () => {
    const before = play(X_TAKES_BOARD_0.slice(0, 4));
    const after = play(X_TAKES_BOARD_0.slice(4), before);
    expect(ultimateMoveSteps(before, after, 0)).toEqual([
      { sound: "ultimateMarkX", variant: 2, at: 0 },
      { sound: "ultimateYouClaimedBoard", at: CLAIM_SOUND_AT },
    ]);
    expect(ultimateMoveSteps(before, after, 1).map((step) => step.sound)).toEqual(["ultimateMarkX", "ultimateBoardClaimed"]);
    expect(ultimateMoveSteps(before, after, null).map((step) => step.sound)).toEqual(["ultimateMarkX", "ultimateBoardClaimed"]);
  });

  it("knocks quietly when a board fills up, and a plain move is just its mark", () => {
    const pattern: Seat[] = [0, 1, 0, 0, 1, 1, 1, 0];
    const before = position(pattern.map((seat, place) => [at(4, place), seat]), 0, 4);
    expect(ultimateMoveSteps(before, play([at(4, 8)], before), 1).map((step) => step.sound)).toEqual(["ultimateMarkX", "ultimateBoardFilledUp"]);
    expect(ultimateMoveSteps(createGame(0), play([at(1, 4)]), 0)).toEqual([{ sound: "ultimateMarkX", variant: 0, at: 0 }]);
  });
});
