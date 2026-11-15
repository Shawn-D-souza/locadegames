import { describe, expect, it } from "vitest";
import { CHECKERS_CONFIG, SQUARE_COUNT } from "../src/shared/games/checkers/config";
import { checkersGame } from "../src/shared/games/checkers/game";
import { applyMove, createGame, firstLegalMove, isDark, legalMoves, positionKey, squareAt } from "../src/shared/games/checkers/rules";
import type { CheckersMove, CheckersState, Seat, Square } from "../src/shared/games/checkers/types";
import { seededRandom } from "../src/shared/random";
import { durations } from "../src/theme";
import { landsAtMs, moveMs, takenAtMs } from "../src/web/games/checkers/moveTiming";
import { moveSoundSteps } from "../src/web/games/checkers/sounds";
import { isFlipped, pointOf, squareDrawnAt, squareUnder } from "../src/web/games/checkers/view";

const { size } = CHECKERS_CONFIG;

/**
 * A position from a picture, top row first: `a` / `A` seat 0's man / king (it moves up), `b` / `B` seat 1's, anything
 * else empty. Only dark squares may hold pieces.
 */
function board(rows: string[], turn: Seat = 0): CheckersState {
  const squares: Square[] = Array<Square>(SQUARE_COUNT).fill(null);
  rows.forEach((line, row) =>
    [...line.replaceAll(" ", "")].forEach((char, column) => {
      const square = squareAt(row, column);
      const piece = { a: { seat: 0, king: false }, A: { seat: 0, king: true }, b: { seat: 1, king: false }, B: { seat: 1, king: true } }[char];
      if (!piece) return;
      if (!isDark(square)) throw new Error(`light square ${row},${column}`);
      squares[square] = piece as Square;
    }),
  );
  return { ...createGame(turn), squares, history: [positionKey(squares, turn)] };
}

const sq = (row: number, column: number) => squareAt(row, column);
const move = (from: [number, number], ...path: [number, number][]): CheckersMove => ({ from: sq(...from), path: path.map((p) => sq(...p)) });

function play(state: CheckersState, ...moves: CheckersMove[]): CheckersState {
  for (const m of moves) {
    const result = applyMove(state, state.turn, m);
    if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(m)}`);
    state = result.state;
  }
  return state;
}

describe("Checkers rules", () => {
  it("sets up 12 men each on the dark squares, seat 0 at the bottom, with 7 opening moves", () => {
    const start = createGame(0);
    const pieces = start.squares.filter((s): s is NonNullable<Square> => s !== null);
    expect([
      pieces.filter((p) => p.seat === 0).length,
      pieces.filter((p) => p.seat === 1).length,
      start.squares.every((s, i) => s === null || isDark(i)),
      start.squares[sq(7, 0)]?.seat,
      start.squares[sq(0, 1)]?.seat,
      legalMoves(start.squares, 0).length,
      legalMoves(start.squares, 1).length,
    ]).toEqual([12, 12, true, 0, 1, 7, 7]);
  });

  it("moves a man one step forward, alternates turns and never mutates the input", () => {
    const start = createGame(0);
    const after = play(start, move([5, 0], [4, 1]));
    expect([start.squares[sq(5, 0)]?.seat, after.squares[sq(5, 0)], after.squares[sq(4, 1)]?.seat, after.turn, after.plies]).toEqual([0, null, 0, 1, 1]);
    // Backwards, sideways, two squares or onto a piece are refused.
    const refused = [move([5, 0], [6, 1]), move([5, 0], [5, 2]), move([5, 0], [3, 2]), move([6, 1], [5, 2])].map((m) => applyMove(start, 0, m));
    expect(refused.map((r) => (r.ok ? "ok" : r.error))).toEqual(["INVALID_MOVE", "INVALID_MOVE", "INVALID_MOVE", "INVALID_MOVE"]);
    expect([applyMove(start, 1, move([2, 1], [3, 0])).ok, applyMove(start, 1, move([2, 1], [3, 0]))]).toEqual([false, { ok: false, error: "NOT_YOUR_TURN" }]);
  });

  it("forces a capture when there is one, and takes the jumped piece", () => {
    const state = board([
      "........",
      "........",
      "........",
      "........",
      "...b....",
      "..a.....",
      ".....a..",
      "........",
    ]);
    const options = legalMoves(state.squares, 0);
    const after = play(state, move([5, 2], [3, 4]));
    expect([options, applyMove(state, 0, move([6, 5], [5, 6])).ok, after.squares[sq(4, 3)], after.lastMove?.captured, after.winner]).toEqual([
      [move([5, 2], [3, 4])],
      false,
      null,
      [sq(4, 3)],
      0,
    ]);
  });

  it("plays a chain of jumps to its end: a part of it is refused", () => {
    const state = board([
      "........",
      "........",
      "...b....",
      "........",
      ".b......",
      "a.......",
      "........",
      "......b.",
    ]);
    const full = move([5, 0], [3, 2], [1, 4]);
    expect([legalMoves(state.squares, 0), applyMove(state, 0, move([5, 0], [3, 2])).ok]).toEqual([[full], false]);
    const after = play(state, full);
    expect([after.squares[sq(4, 1)], after.squares[sq(2, 3)], after.squares[sq(1, 4)], after.lastMove?.captured]).toEqual([
      null,
      null,
      { seat: 0, king: false },
      [sq(4, 1), sq(2, 3)],
    ]);
  });

  it("lets men capture forward only, kings every way, and never jumps a piece twice", () => {
    const men = board(["........", "........", "........", "........", "........", "..a.....", ".b......", "......b."]);
    const king = board(["........", "........", "........", "........", "........", "..A.....", ".b......", "......b."]);
    // A king boxed in by four men round a square: it can take each once, round the ring, and must stop.
    const ring = board([".......b", "........", "........", "..b.b...", ".A......", "..b.b...", "........", "b......."]);
    const longest = Math.max(...legalMoves(ring.squares, 0).map((m) => m.path.length));
    expect([legalMoves(men.squares, 0).every((m) => m.path.length === 1), legalMoves(king.squares, 0), longest]).toEqual([
      true,
      [move([5, 2], [7, 0])],
      4,
    ]);
  });

  it("crowns a man on the far row, which ends its move even with another jump waiting", () => {
    const state = board(["........", "..b.b...", ".a......", "........", "........", "........", "........", "......b."]);
    // From (2,1): jump (1,2) to (0,3), crowned there; as a king it could jump (1,4) next, but the move ends.
    const after = play(state, move([2, 1], [0, 3]));
    expect([legalMoves(state.squares, 0), after.squares[sq(0, 3)], after.lastMove?.crowned, after.squares[sq(1, 4)]?.seat]).toEqual([
      [move([2, 1], [0, 3])],
      { seat: 0, king: true },
      true,
      1,
    ]);
  });

  it("wins when the other side has no pieces left, or none that can move", () => {
    const lastPiece = play(board(["........", "........", "........", "..b.....", ".a......", "........", "........", "........"]), move([4, 1], [2, 3]));
    // Seat 1's only man is on the edge, blocked by two of seat 0's men in a row: it can't step or jump.
    const blocked = play(
      board(["........", "........", "........", "b.......", ".a......", "..a.....", "........", "......a."]),
      move([7, 6], [6, 5]),
    );
    expect([lastPiece.winner, checkersGame.outcome(lastPiece), blocked.winner]).toEqual([0, { kind: "win", seat: 0 }, 0]);
  });

  it("draws after 40 moves each with no capture and no man moving", () => {
    // Two kings far apart walk back and forth.
    let state = board([".B......", "........", "........", "........", "........", "........", "........", "......A."]);
    state = { ...state, history: [] };
    const shuffle = [move([7, 6], [6, 7]), move([0, 1], [1, 0]), move([6, 7], [7, 6]), move([1, 0], [0, 1])];
    const plies: CheckersState[] = [];
    // Repetition is turned off by clearing the history each move, so only the 40-move rule can end it.
    for (let i = 0; i < CHECKERS_CONFIG.quietMovesEach * 2 && !state.isDraw; i++) {
      state = { ...play(state, shuffle[i % 4]!), history: [] };
      plies.push(state);
    }
    expect([plies.length, state.isDraw, state.drawReason, plies.at(-2)?.isDraw]).toEqual([80, true, "quiet", false]);
  });

  it("draws when the same position comes up a third time, and a man moving starts the count again", () => {
    const start = board([".B......", "........", "........", "........", "........", "........", ".a......", "......A."]);
    const shuffle = [move([7, 6], [6, 7]), move([0, 1], [1, 0]), move([6, 7], [7, 6]), move([1, 0], [0, 1])];
    const twice = play(start, ...shuffle, ...shuffle.slice(0, 3));
    const thrice = play(twice, shuffle[3]!);
    // A man steps in between: the history starts again.
    const reset = play(start, ...shuffle, move([6, 1], [5, 0]));
    expect([twice.isDraw, thrice.isDraw, thrice.drawReason, checkersGame.outcome(thrice), reset.history.length, reset.quietPlies]).toEqual([
      false,
      true,
      "repetition",
      { kind: "draw" },
      1,
      0,
    ]);
  });

  it("reads only well-formed moves from the wire", () => {
    const good = { from: 40, path: [33] };
    const bad = [null, 3, "x", {}, { from: 40 }, { from: 40, path: [] }, { from: -1, path: [33] }, { from: 40, path: [64] }, { from: 40, path: [1.5] }, { from: 40, path: Array(13).fill(33) }];
    expect([checkersGame.parseMove(good), ...bad.map((raw) => checkersGame.parseMove(raw))]).toEqual([good, ...bad.map(() => null)]);
  });

  it("plays the first legal move on a timeout", () => {
    const start = createGame(0);
    expect(play(start, checkersGame.autoMove(start)).plies).toBe(1);
    expect(firstLegalMove(start)).toEqual(legalMoves(start.squares, 0)[0]);
  });

  it("keeps 200 random games legal to their end", () => {
    const random = seededRandom(7);
    const problems: string[] = [];
    let wins = 0;
    let draws = 0;
    for (let game = 0; game < 200; game++) {
      let state = createGame((game % 2) as Seat);
      while (state.winner === null && !state.isDraw) {
        const options = legalMoves(state.squares, state.turn);
        if (options.length === 0) problems.push(`game ${game}: stuck`);
        const next = applyMove(state, state.turn, options[Math.floor(random() * options.length)]!);
        if (!next.ok) {
          problems.push(`game ${game}: ${next.error}`);
          break;
        }
        state = next.state;
        const counts = [0, 1].map((seat) => state.squares.filter((s) => s?.seat === seat).length);
        if (counts.some((n) => n > 12) || state.squares.some((s, i) => s !== null && !isDark(i))) problems.push(`game ${game}: bad board`);
        const moved = state.squares[state.lastMove!.path.at(-1)!];
        if (moved?.seat === 0 && moved.king === false && Math.floor(state.lastMove!.path.at(-1)! / size) === 0) problems.push(`game ${game}: uncrowned`);
      }
      if (state.winner !== null) wins++;
      else draws++;
    }
    expect([problems, wins + draws, wins > 0]).toEqual([[], 200, true]);
  });
});

describe("Checkers on screen", () => {
  it("turns the board round on the second seat's phone, so your pieces are at the bottom", () => {
    const corners = [sq(7, 0), sq(0, 7)];
    const drawn = [false, true].map((flipped) => corners.map((square) => pointOf(square, flipped)));
    const roundTrip = [false, true].every((flipped) =>
      Array.from({ length: SQUARE_COUNT }, (_, i) => i).every((square) => {
        const point = pointOf(square, flipped);
        return squareUnder({ x: point.x + 0.5, y: point.y + 0.5 }, flipped) === square && squareDrawnAt(point.y * size + point.x, flipped) === square;
      }),
    );
    expect([isFlipped(0), isFlipped(1), isFlipped(null), drawn, roundTrip, squareUnder({ x: 8.2, y: 1 }, false)]).toEqual([
      false,
      true,
      false,
      [
        [{ x: 0, y: 7 }, { x: 7, y: 0 }],
        [{ x: 7, y: 0 }, { x: 0, y: 7 }],
      ],
      true,
      null,
    ]);
  });

  it("times a move's hops, the pieces it takes and its crown, and its sounds land with them", () => {
    const hop = durations.checkerHop;
    const chain = { path: [1, 2, 3], captured: [10, 11, 12], crowned: true };
    expect([
      [landsAtMs(1), landsAtMs(3), takenAtMs(0), takenAtMs(2), moveMs(chain), moveMs({ path: [5], crowned: false })],
      moveSoundSteps(chain, 100),
      moveSoundSteps({ path: [9], captured: [], crowned: false }),
    ]).toEqual([
      [hop, 3 * hop, hop / 2, 2.5 * hop, 3 * hop + durations.slow, hop],
      [
        { sound: "checkersCapture", at: 100 + hop, variant: 0 },
        { sound: "checkersCapture", at: 100 + 2 * hop, variant: 1 },
        { sound: "checkersCapture", at: 100 + 3 * hop, variant: 2 },
        { sound: "checkersCrowned", at: 100 + 3 * hop },
      ],
      [{ sound: "checkersStep", at: hop }],
    ]);
  });
});
