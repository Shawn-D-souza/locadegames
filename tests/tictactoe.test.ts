import { describe, expect, it } from "vitest";
import { applyMove, createGame, LINES } from "../src/shared/games/tictactoe/rules";
import type { Seat, TicTacToeState } from "../src/shared/games/tictactoe/types";

function play(moves: number[], first: Seat = 0): TicTacToeState {
  let state = createGame(first);
  for (const cell of moves) {
    const result = applyMove(state, state.turn, cell);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
}

describe("tic-tac-toe rules", () => {
  it("has 8 winning lines", () => {
    expect(LINES).toHaveLength(8);
  });

  it("alternates turns and never mutates the input", () => {
    const start = createGame(1);
    const result = applyMove(start, 1, 4);
    expect(result.ok && result.state.turn).toBe(0);
    expect(start.board[4]).toBeNull();
  });

  it("detects a row win", () => {
    const state = play([0, 3, 1, 4, 2]);
    expect(state.winner).toBe(0);
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  it("detects a diagonal win for the second player", () => {
    const state = play([1, 2, 3, 4, 8, 6]);
    expect(state.winner).toBe(1);
    expect(state.winningLine).toEqual([2, 4, 6]);
  });

  it("detects a draw", () => {
    const state = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(state.isDraw).toBe(true);
    expect(state.winner).toBeNull();
  });

  it("rejects illegal moves", () => {
    const state = play([4]);
    expect(applyMove(state, 0, 0)).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    expect(applyMove(state, 1, 4)).toEqual({ ok: false, error: "CELL_TAKEN" });
    expect(applyMove(state, 1, 9)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(state, 1, 1.5)).toEqual({ ok: false, error: "INVALID_MOVE" });
    const won = play([0, 3, 1, 4, 2]);
    expect(applyMove(won, 1, 8)).toEqual({ ok: false, error: "GAME_OVER" });
  });
});
