import { describe, expect, it } from "vitest";
import { CHESS_CONFIG } from "../src/shared/games/chess/config";
import { chessGame } from "../src/shared/games/chess/game";
import { columnOf, inCheck, isLight, kingSquare, squareAt } from "../src/shared/games/chess/moves";
import { applyMove, clockLeft, createGame, expire, legalMoves, parseMove, positionKey, turnTimeMs } from "../src/shared/games/chess/rules";
import type { Castling, ChessMove, ChessState, PieceKind, Seat, Square } from "../src/shared/games/chess/types";
import { seededRandom } from "../src/shared/random";
import { claimTimeout, playMove, startTournament } from "../src/shared/tournament/tournament";
import type { TurnMatch } from "../src/shared/tournament/types";
import { durations } from "../src/theme";
import { endDetail } from "../src/web/games/chess/endDetail";
import { landsAtMs, moveMs, takenAtMs } from "../src/web/games/chess/moveTiming";
import { moveSoundSteps } from "../src/web/games/chess/sounds";
import { isFlipped, pointOf, squareDrawnAt, squareName, squareUnder } from "../src/web/games/chess/view";

const { clockMs, incrementMs, moveLimitMs } = CHESS_CONFIG;

const KINDS: Record<string, PieceKind> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/** A square by its chess name: `e2` is seat 0's king's pawn (seat 0 plays up from the bottom, like White). */
const at = (name: string) => squareAt(8 - Number(name[1]), name.charCodeAt(0) - 97);
const move = (from: string, to: string, promotion?: ChessMove["promotion"]): ChessMove => ({ from: at(from), to: at(to), ...(promotion ? { promotion } : {}) });

/** A position from FEN (White is seat 0, Black seat 1). */
function fen(text: string): ChessState {
  const [placement, turn, rights, passant] = text.split(" ");
  const squares: Square[] = [];
  for (const char of placement!.replaceAll("/", "")) {
    if (/\d/.test(char)) squares.push(...Array<Square>(Number(char)).fill(null));
    else squares.push({ seat: char === char.toUpperCase() ? 0 : 1, kind: KINDS[char.toLowerCase()]! });
  }
  const side = (king: string, queen: string): Castling => ({ kingSide: rights!.includes(king), queenSide: rights!.includes(queen) });
  const castling: [Castling, Castling] = [side("K", "Q"), side("k", "q")];
  const seat: Seat = turn === "w" ? 0 : 1;
  const enPassant = passant === "-" ? null : at(passant!);
  return { ...createGame(seat), squares, castling, enPassant, history: [positionKey(squares, seat, castling, enPassant)] };
}

function play(state: ChessState, ...moves: ChessMove[]): ChessState {
  for (const m of moves) {
    const result = applyMove(state, state.turn, m, 0);
    if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(m)}`);
    state = result.state;
  }
  return state;
}

/** Counts every line of play `depth` moves deep: the standard check that a move generator is exactly right. */
function perft(state: ChessState, depth: number): number {
  const moves = legalMoves(state);
  if (depth === 1) return moves.length;
  return moves.reduce((sum, m) => sum + perft(play(state, m), depth - 1), 0);
}

describe("Chess rules", () => {
  it("sets up both sides, seat 0 at the bottom with a light square on its right, and 20 opening moves", () => {
    const start = createGame(0);
    const pieces = start.squares.filter((s): s is NonNullable<Square> => s !== null);
    expect([
      pieces.filter((p) => p.seat === 0).length,
      pieces.filter((p) => p.seat === 1).length,
      start.squares[at("e1")],
      start.squares[at("d8")],
      kingSquare(start.squares, 0) === at("e1"),
      isLight(at("h1")),
      legalMoves(start).length,
      start.clocks,
      turnTimeMs(start),
    ]).toEqual([16, 16, { seat: 0, kind: "king" }, { seat: 1, kind: "queen" }, true, true, 20, [clockMs, clockMs], moveLimitMs]);
  });

  it("finds exactly every legal move (perft counts of the standard test positions)", () => {
    const counts = [
      perft(createGame(0), 3),
      perft(fen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -"), 2),
      perft(fen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -"), 3),
      perft(fen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -"), 3),
      perft(fen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -"), 2),
    ];
    expect(counts).toEqual([8902, 2039, 2812, 9467, 1486]);
  });

  it("castles on both sides, the rook coming along, but never out of, through or into check", () => {
    const open = fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq -");
    const short = play(open, move("e1", "g1"));
    const long = play(open, move("e1", "c1"));
    // A rook on f8 watches f1: no castling through it; one on e8 gives check: no castling at all.
    const through = fen("r3kr2/8/8/8/8/8/8/R3K2R w KQq -");
    const checked = fen("r3r1k1/8/8/8/8/8/8/R3K2R w KQ -");
    const castles = (state: ChessState) => legalMoves(state).filter((m) => m.from === at("e1") && Math.abs(m.to - m.from) === 2).map((m) => m.to);
    expect([
      short.squares[at("g1")]?.kind,
      short.squares[at("f1")]?.kind,
      short.squares[at("h1")],
      short.lastMove?.castle,
      long.squares[at("c1")]?.kind,
      long.squares[at("d1")]?.kind,
      short.castling[0],
      castles(through),
      castles(checked),
    ]).toEqual([
      "king",
      "rook",
      null,
      { from: at("h1"), to: at("f1") },
      "king",
      "rook",
      { kingSide: false, queenSide: false },
      [at("c1")],
      [],
    ]);
  });

  it("loses the right to castle on a side once its rook moves or is taken", () => {
    const open = fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq -");
    const rookMoved = play(open, move("h1", "h2"));
    const rookTaken = play(open, move("a1", "a8"));
    expect([rookMoved.castling[0], rookTaken.castling[1]]).toEqual([
      { kingSide: false, queenSide: true },
      { kingSide: true, queenSide: false },
    ]);
  });

  it("takes en passant only at once, removing the pawn beside", () => {
    const state = play(createGame(0), move("e2", "e4"), move("a7", "a6"), move("e4", "e5"), move("d7", "d5"));
    const taken = play(state, move("e5", "d6"));
    const later = play(state, move("h2", "h3"), move("h7", "h6"));
    expect([
      state.enPassant === at("d6"),
      taken.squares[at("d5")],
      taken.lastMove?.captured,
      legalMoves(later).some((m) => m.from === at("e5") && m.to === at("d6")),
    ]).toEqual([true, null, { square: at("d5"), kind: "pawn" }, false]);
  });

  it("promotes a pawn on the far row to the piece picked; one with no piece named is refused", () => {
    const state = fen("8/P6k/8/8/8/8/8/K7 w - -");
    const picks = (["queen", "rook", "bishop", "knight"] as const).map((piece) => play(state, move("a7", "a8", piece)).squares[at("a8")]?.kind);
    const bare = applyMove(state, 0, move("a7", "a8"), 0);
    expect([picks, bare.ok, play(state, move("a7", "a8", "queen")).lastMove?.promotion]).toEqual([["queen", "rook", "bishop", "knight"], false, "queen"]);
  });

  it("wins by checkmate, and never lets a move leave your own king in check", () => {
    const mate = play(createGame(0), move("f2", "f3"), move("e7", "e5"), move("g2", "g4"), move("d8", "h4"));
    // The rook on e2 is pinned to its king by the one on e8: it may only move along the e-file.
    const pinned = legalMoves(fen("4r1k1/8/8/8/8/8/4R3/4K3 w - -")).filter((m) => m.from === at("e2"));
    expect([
      chessGame.outcome(mate),
      mate.winReason,
      mate.lastMove?.check,
      inCheck(mate.squares, 0),
      [pinned.length, pinned.every((m) => columnOf(m.to) === 4)],
      applyMove(fen("4k3/8/8/8/8/8/8/4K2r w - -"), 0, move("e1", "f1"), 0).ok,
    ]).toEqual([{ kind: "win", seat: 1 }, "checkmate", true, true, [6, true], false]);
  });

  it("draws by stalemate, and when neither side can ever mate", () => {
    const stalemate = play(fen("7k/8/6Q1/8/8/8/8/K7 w - -"), move("g6", "f7"));
    const bareKings = play(fen("7k/8/8/8/8/8/1q6/K7 w - -"), move("a1", "b2"));
    expect([
      [stalemate.isDraw, stalemate.drawReason, chessGame.outcome(stalemate)],
      [bareKings.isDraw, bareKings.drawReason],
    ]).toEqual([
      [true, "stalemate", { kind: "draw" }],
      [true, "material"],
    ]);
    // A king and a bishop each, on squares of one color: nobody can mate.
    const oneColor = play(fen("k7/8/8/8/8/8/1b6/KB5n w - -"), move("a1", "b2"));
    expect([oneColor.isDraw, oneColor.drawReason]).toEqual([false, null]);
    const bishopsOnly = play(fen("k7/8/8/8/8/8/1n6/KB2b3 w - -"), move("a1", "b2"));
    expect([bishopsOnly.isDraw, bishopsOnly.drawReason, isLight(at("b1")) === isLight(at("e1"))]).toEqual([false, null, false]);
    const sameColor = play(fen("k7/8/8/8/8/8/1n6/KB1b4 w - -"), move("a1", "b2"));
    expect([sameColor.isDraw, sameColor.drawReason]).toEqual([true, "material"]);
  });

  it("draws when the same position comes up a third time, and after 50 moves each with no capture or pawn move", () => {
    const shuffle = [move("g1", "f3"), move("g8", "f6"), move("f3", "g1"), move("f6", "g8")];
    const twice = play(createGame(0), ...shuffle);
    const thrice = play(twice, ...shuffle);
    const nearly = { ...fen("r3k3/8/8/8/8/8/8/R3K3 w - -"), quietPlies: 99 };
    const quiet = play(nearly, move("a1", "b1"));
    const pawn = play({ ...createGame(0), quietPlies: 99 }, move("e2", "e4"));
    expect([twice.isDraw, thrice.isDraw, thrice.drawReason, quiet.quietPlies, quiet.drawReason, pawn.quietPlies, pawn.isDraw]).toEqual([
      false,
      true,
      "repetition",
      100,
      "quiet",
      0,
      false,
    ]);
  });

  it("runs only the mover's clock, adds the increment after each move, gives a turn the move's limit or the clock left, and loses on time", () => {
    const first = applyMove(createGame(0), 0, move("e2", "e4"), 30_000);
    const state = first.ok ? first.state : createGame(0);
    const short = { ...createGame(0), clocks: [45_000, clockMs] as [number, number] };
    const late = applyMove(createGame(0), 0, move("e2", "e4"), moveLimitMs);
    expect([
      state.clocks,
      turnTimeMs(state),
      turnTimeMs(short),
      clockLeft(state, 1, 10_000),
      clockLeft(state, 0, 10_000),
      [expire(createGame(0)).winner, expire(createGame(0)).winReason, expire(createGame(0)).clocks[0]],
      [expire(short).winner, expire(short).winReason, expire(short).clocks[0]],
      late.ok && [late.state.winner, late.state.winReason, late.state.plies],
    ]).toEqual([
      [clockMs - 30_000 + incrementMs, clockMs],
      moveLimitMs,
      45_000,
      clockMs - 10_000,
      clockMs - 30_000 + incrementMs,
      [1, "moveLimit", clockMs - moveLimitMs],
      [1, "clock", 0],
      [1, "moveLimit", 0],
    ]);
  });

  it("takes the move's time off the clock in a tournament, and a claim after the deadline loses on time", () => {
    const t0 = startTournament("chess", [{ id: 0, name: "Ana", trophies: 0, joinOrder: 0 }, { id: 1, name: "Ben", trophies: 0, joinOrder: 1 }], 1_000, 7);
    const match = t0.rounds[0]!.matches[0]! as TurnMatch;
    const mover = match.players[0];
    const moved = playMove(t0, mover, move("e2", "e4"), 1_000 + 12_000);
    const after = moved.ok ? (moved.tournament.rounds[0]!.matches[0]! as TurnMatch) : match;
    const early = claimTimeout(moved.ok ? moved.tournament : t0, match.id, 13_000 + moveLimitMs - 1, 1);
    const claimed = claimTimeout(moved.ok ? moved.tournament : t0, match.id, 13_000 + moveLimitMs, 1);
    const ended = claimed.ok ? claimed.tournament.rounds[0]!.matches[0]! : null;
    expect([(after.game as ChessState).clocks, early.ok, ended?.result, ended?.winner]).toEqual([[clockMs - 12_000 + incrementMs, clockMs], false, "win", mover]);
  });

  it("reads only well-formed moves from the wire", () => {
    expect([
      parseMove({ from: 52, to: 36 }),
      parseMove({ from: 8, to: 0, promotion: "knight" }),
      parseMove({ from: 8, to: 0, promotion: "king" }),
      parseMove({ from: 64, to: 0 }),
      parseMove({ from: 1.5, to: 0 }),
      parseMove("e2e4"),
      parseMove(null),
    ]).toEqual([{ from: 52, to: 36 }, { from: 8, to: 0, promotion: "knight" }, null, null, null, null, null]);
  });

  it("keeps 20 random games legal to their end: one king each, never left in check", () => {
    const random = seededRandom(11);
    const broken: string[] = [];
    let ended = 0;
    for (let game = 0; game < 20; game++) {
      let state = createGame(0);
      for (let ply = 0; ply < 600; ply++) {
        const moves = legalMoves(state);
        if (moves.length === 0) break;
        const mover = state.turn;
        state = play(state, moves[Math.floor(random() * moves.length)]!);
        const kings = state.squares.filter((p) => p?.kind === "king").length;
        if (kings !== 2 || inCheck(state.squares, mover)) broken.push(`game ${game} ply ${ply}`);
      }
      if (state.winner !== null || state.isDraw) ended++;
    }
    expect([broken, ended]).toEqual([[], 20]);
  });
});

describe("Chess on screen", () => {
  it("turns the board round on the second seat's phone, so your pieces are at the bottom, and names squares as players do", () => {
    const e1 = at("e1");
    expect([
      [isFlipped(0), isFlipped(1), isFlipped(null)],
      pointOf(e1, false),
      pointOf(e1, true),
      squareUnder({ x: 3.5, y: 0.2 }, true) === e1,
      squareUnder({ x: 8.1, y: 0 }, false),
      squareDrawnAt(0, true) === at("h1"),
      [squareName(e1), squareName(at("a8")), squareName(at("h1"))],
    ]).toEqual([[false, true, false], { x: 4, y: 7 }, { x: 3, y: 0 }, true, null, true, ["e1", "a8", "h1"]]);
  });

  it("times a move's slide, the piece it takes and a promotion, and its sounds land with them", () => {
    const quiet = { captured: null, castle: null, promotion: null, check: false };
    const capture = { ...quiet, captured: { square: at("d5"), kind: "pawn" as const }, check: true };
    const castle = { ...quiet, castle: { from: at("h1"), to: at("f1") } };
    const promotion = { ...quiet, promotion: "queen" as const };
    const names = (steps: ReturnType<typeof moveSoundSteps>) => steps.map((step) => `${step.sound}@${step.at - landsAtMs}`);
    expect([
      landsAtMs === durations.chessSlide,
      takenAtMs < landsAtMs,
      [moveMs(quiet), moveMs(promotion) > moveMs(quiet)],
      names(moveSoundSteps(quiet)),
      names(moveSoundSteps(capture)),
      names(moveSoundSteps(castle)),
      names(moveSoundSteps(promotion)),
      moveSoundSteps(quiet, 100)[0]!.at,
    ]).toEqual([
      true,
      true,
      [landsAtMs, true],
      ["chessMove@0"],
      ["chessCapture@0", "chessCheck@70"],
      ["chessCastle@0"],
      ["chessMove@0", "chessPromote@0"],
      100 + landsAtMs,
    ]);
  });

  it("says why a game ended under the result", () => {
    const mate = play(createGame(0), move("f2", "f3"), move("e7", "e5"), move("g2", "g4"), move("d8", "h4"));
    expect([endDetail(createGame(0)), endDetail(mate), endDetail(expire(createGame(0))), endDetail(play(fen("7k/8/6Q1/8/8/8/8/K7 w - -"), move("g6", "f7")))]).toEqual([
      null,
      "Checkmate",
      "Over 2 min on a move",
      "Stalemate",
    ]);
  });
});
