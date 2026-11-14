import { describe, expect, it } from "vitest";
import { armOf, boardFor, homeProgress, isSafe, startSquare, trackSquare } from "../src/shared/games/ludo/board";
import { LUDO_CONFIG, actionMs } from "../src/shared/games/ludo/config";
import { applyMove, autoPawn, createGame, expire, finalPlaces, isIn, parseMove, quitSeat } from "../src/shared/games/ludo/rules";
import type { LudoState } from "../src/shared/games/ludo/types";
import { claimPartyTimeout, partyDeadline, playPartyMove, quitParty, startParty } from "../src/shared/party/party";
import { actionCues } from "../src/web/games/ludo/actionCues";
import { DIE_HITS } from "../src/web/games/dice/dieMotion";

/** Rolls `die` for whoever's turn it is; fails the test if refused. */
function roll(state: LudoState, die: number): LudoState {
  const result = applyMove(state, state.turn, { kind: "roll", die });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** Whoever's turn it is moves `pawn` with the die they rolled. */
function pick(state: LudoState, pawn: number): LudoState {
  const result = applyMove(state, state.turn, { kind: "pick", pawn });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** A game with pawns already placed (seat 0 to roll). */
function at(pawns: number[][]): LudoState {
  return { ...createGame(pawns.length), pawns };
}

/** On the 2-player board (the classic cross, seats on arms 0 and 2), the progress of seat 1 standing on track `square`. */
const seat1On = (square: number) => (square - startSquare(boardFor(2), 2) + 52) % 52;
const HOME = homeProgress(boardFor(2));

describe("ludo boards", () => {
  it("grow with the room, keep a pawn's trip about the classic length, and spread the players round them", () => {
    expect({
      boards: [2, 4, 5, 6, 7, 8].map((players) => boardFor(players)),
      trips: [4, 6, 8].map((players) => homeProgress(boardFor(players))),
      classic: { start: startSquare(boardFor(4), 0), star: [...Array(52).keys()].filter((s) => isSafe(boardFor(4), s)) },
      arms: { two: [0, 1].map((s) => armOf(boardFor(2), s, 2)), five: [0, 1, 2, 3, 4].map((s) => armOf(boardFor(5), s, 5)) },
      track: [trackSquare(boardFor(4), 1, 0), trackSquare(boardFor(4), 3, 50), trackSquare(boardFor(4), 0, 51), trackSquare(boardFor(4), 0, -1)],
    }).toEqual({
      boards: [
        { arms: 4, armLength: 6, track: 52 },
        { arms: 4, armLength: 6, track: 52 },
        { arms: 6, armLength: 4, track: 54 },
        { arms: 6, armLength: 4, track: 54 },
        { arms: 8, armLength: 3, track: 56 },
        { arms: 8, armLength: 3, track: 56 },
      ],
      trips: [56, 56, 57],
      classic: { start: 8, star: [3, 8, 16, 21, 29, 34, 42, 47] },
      arms: { two: [0, 2], five: [0, 1, 2, 3, 4] },
      // Arm 1's start; arm 3's last track square is its own tip (45); then the home column, and the base.
      track: [21, 45, null, null],
    });
  });
});

describe("ludo rules", () => {
  it("needs a 6 to leave the base, lets the roller pick which pawn comes out, moves the only pawn that can by itself, and a 6 rolls again", () => {
    const g = createGame(2);
    const three = roll(g, 3);
    const six = roll(three, 6);
    const out = pick(six, 2);
    const only = roll(at([[4, -1, -1, -1], [-1, -1, -1, -1]]), 3);
    expect({
      three: [three.last?.outcome, three.turn],
      six: [six.last?.outcome, six.die, six.turn],
      out: { step: out.last?.step, again: out.last?.again, turn: out.turn, pawns: out.pawns[1] },
      only: [only.last?.outcome, only.pawns[0], only.turn],
    }).toEqual({
      three: ["noMove", 1],
      six: ["choose", 6, 1],
      out: { step: { pawn: 2, from: -1, to: 0, captured: [] }, again: true, turn: 1, pawns: [-1, -1, 0, -1] },
      only: ["moved", [7, -1, -1, -1], 1],
    });
  });

  it("asks the roller to pick when pawns stand apart, and refuses a pawn that can't move", () => {
    const g = roll(at([[4, 10, -1, -1], [-1, -1, -1, -1]]), 3);
    const refused = applyMove(g, 0, { kind: "pick", pawn: 2 });
    const rollAgain = applyMove(g, 0, { kind: "roll", die: 2 });
    const picked = pick(g, 1);
    expect({ waiting: [g.last?.outcome, g.die, g.turn], refused: refused.ok, rollAgain: rollAgain.ok, picked: [picked.pawns[0], picked.turn, picked.die] }).toEqual({
      waiting: ["choose", 3, 0],
      refused: false,
      rollAgain: false,
      picked: [[4, 13, -1, -1], 1, null],
    });
  });

  it("sends a pawn landed on back to its base and rolls again, but nobody is captured on a safe square", () => {
    const capture = roll(at([[10, -1, -1, -1], [seat1On(20), -1, -1, -1]]), 2);
    const safe = roll(at([[11, -1, -1, -1], [seat1On(21), -1, -1, -1]]), 2);
    expect({
      capture: [capture.pawns, capture.last?.step?.captured, capture.last?.again, capture.turn],
      safe: [safe.pawns[1], safe.last?.again],
    }).toEqual({
      capture: [[[12, -1, -1, -1], [-1, -1, -1, -1]], [{ seat: 1, pawn: 0, from: seat1On(20) }], true, 0],
      safe: [[seat1On(21), -1, -1, -1], false],
    });
  });

  it("needs the exact roll home, rolls again on getting a pawn home, and finishing passes the turn", () => {
    const tooBig = roll(at([[HOME - 2, HOME, HOME, HOME], [-1, -1, -1, -1]]), 3);
    const homeOne = roll(at([[HOME - 2, HOME, HOME, -1], [-1, -1, -1, -1]]), 2);
    const done = roll(at([[HOME - 2, HOME, HOME, HOME], [-1, -1, -1, -1], [-1, -1, -1, -1]]), 2);
    expect({
      tooBig: [tooBig.last?.outcome, tooBig.turn],
      homeOne: [homeOne.last?.again, homeOne.turn],
      done: [done.finishOrder, done.last?.finished, done.last?.again, done.turn, isIn(done, 0), done.over],
    }).toEqual({
      tooBig: ["noMove", 1],
      homeOne: [true, 0],
      done: [[0], true, false, 1, false, false],
    });
  });

  it("ends the turn unplayed on the third 6 in a row", () => {
    let g = at([[0, 20, -1, -1], [-1, -1, -1, -1]]);
    g = pick(roll(g, 6), 1);
    g = pick(roll(g, 6), 1);
    const third = roll(g, 6);
    expect([third.last?.outcome, third.pawns[0], third.turn, third.sixes]).toEqual(["threeSixes", [0, 32, -1, -1], 1, 0]);
  });

  it("when time runs out, rolls and moves by the fixed rule in one go, or moves the die already rolled", () => {
    const base = at([[4, 30, -1, -1], [seat1On(14), -1, -1, -1]]);
    const rolled = expire(base, 6);
    const waiting = roll(base, 4);
    const picked = expire(waiting, 1);
    expect({
      auto: [autoPawn(base, 0, 6), autoPawn(base, 0, 2), autoPawn(at([[HOME - 3, 30, -1, -1], [-1, -1, -1, -1]]), 0, 3)],
      rolled: rolled.ok && [rolled.state.last?.outcome, rolled.state.last?.rolled, rolled.state.moves],
      picked: picked.ok && [picked.state.last?.step?.pawn, picked.state.last?.rolled, picked.state.moves],
    }).toEqual({
      // A 6: out of the base. A 2: the capture on 14 (4 → 6). Getting home beats the rest.
      auto: [2, 0, 0],
      rolled: ["moved", true, 1],
      // 4 → 8 is the start square: safe, nothing captured, so the furthest along moves.
      picked: [1, false, 2],
    });
  });

  it("plays on until all but one are home; quitters rank last, the latest first", () => {
    let g = at([[HOME - 1, HOME, HOME, HOME], [20, -1, -1, -1], [30, 5, -1, -1], [-1, -1, -1, -1]]);
    g = roll(g, 1);
    g = quitSeat(g, 3);
    g = quitSeat(g, 1);
    expect({ over: g.over, places: finalPlaces(g) }).toEqual({
      over: true,
      places: [
        { seat: 0, place: 1, quit: false },
        { seat: 2, place: 2, quit: false },
        { seat: 1, place: 3, quit: true },
        { seat: 3, place: 4, quit: true },
      ],
    });
  });

  it("reads moves from the wire, a chosen die only on a dev server", () => {
    expect([
      parseMove("roll"),
      parseMove({ pawn: 3 }),
      parseMove({ pawn: 4 }),
      parseMove({ die: 6 }),
      parseMove({ die: 6 }, true),
      parseMove({ die: 7 }, true),
      parseMove("move"),
    ]).toEqual([{ kind: "roll", die: null }, { kind: "pick", pawn: 3 }, null, null, { kind: "roll", die: 6 }, null, null]);
  });
});

describe("ludo party", () => {
  it("rolls the server's die, starts the next clock once a move has played out, plays timeouts, and crowns the winner", () => {
    const now = 1_000;
    const players = [0, 1, 2].map((id) => ({ id, name: `P${id}`, firsts: 0 }));
    let party = startParty("ludo", players, now, 7);
    const first = party.entrants[0]!.id;
    const moved = playPartyMove(party, first, "roll", now, 5); // die 6: which pawn comes out is theirs to pick
    if (!moved.ok) throw new Error(moved.error);
    party = moved.party;
    const late = claimPartyTimeout(party, party.game.moves, partyDeadline(party) + 1, 0); // the pick runs out: a pawn comes out, and the 6 rolls again
    if (!late.ok) throw new Error(late.error);
    let ended = late.party;
    for (const e of ended.entrants.slice(1)) {
      const out = quitParty(ended, e.id, now);
      if (out.ok) ended = out.party;
    }
    expect({
      clock: party.turnStartedAt - now,
      again: party.game.turn,
      timeout: [late.party.game.last?.outcome, late.party.game.turn],
      champions: ended.championIds,
      places: ended.results.map((r) => r.place),
    }).toEqual({
      clock: LUDO_CONFIG.dieMs + LUDO_CONFIG.settleMs,
      again: 0,
      timeout: ["moved", 0],
      champions: [first],
      places: [1, 2, 3],
    });
  });

  it("times each action as it plays out on screen", () => {
    const { dieMs, settleMs, hopMs, enterMs, captureMs, threeSixesMs } = LUDO_CONFIG;
    const step = (from: number, to: number, captured = 0) => ({ pawn: 0, from, to, captured: Array(captured).fill({ seat: 1, pawn: 0, from: 3 }) });
    const action = (rolled: boolean, outcome: "moved" | "choose" | "noMove" | "threeSixes", s: ReturnType<typeof step> | null) => ({ seat: 0, die: 3, rolled, outcome, step: s, again: false, finished: false });
    expect([
      actionMs(action(true, "moved", step(4, 7))),
      actionMs(action(true, "moved", step(-1, 0))),
      actionMs(action(false, "moved", step(4, 9, 1))),
      actionMs(action(true, "choose", null)),
      actionMs(action(true, "threeSixes", null)),
    ]).toEqual([dieMs + settleMs + 3 * hopMs, dieMs + settleMs + enterMs, 5 * hopMs + captureMs, dieMs + settleMs, dieMs + settleMs + threeSixesMs]);
  });
});

describe("ludo cues", () => {
  it("times each action's sounds to how it plays out, and feels only your own moves and your pawn captured", () => {
    const { dieMs, settleMs, hopMs } = LUDO_CONFIG;
    const start = dieMs + settleMs;
    const lands = DIE_HITS.at(-1)!.at * dieMs;
    const enter = { seat: 0, die: 6, rolled: true, outcome: "moved" as const, step: { pawn: 0, from: -1, to: 0, captured: [] }, again: true, finished: false };
    const capture = { seat: 1, die: 2, rolled: false, outcome: "moved" as const, step: { pawn: 1, from: 10, to: 12, captured: [{ seat: 0, pawn: 0, from: 40 }] }, again: true, finished: false };
    const steps = (cues: ReturnType<typeof actionCues>) => ({ sounds: cues.sounds.map((s) => [s.sound, Math.round(s.at)]), felt: cues.haptics.map((h) => h.haptic) });
    expect({
      enter: steps(actionCues(enter, "mine", 3, 0, HOME)),
      captured: steps(actionCues(capture, "theirs", 4, 0, HOME)),
      watching: actionCues(capture, "watching", 4, null, HOME).haptics,
    }).toEqual({
      enter: { sounds: [["dieRoll", 0], ["dieSix", Math.round(lands + 140)], ["ludoEnter", start]], felt: ["dieLands", "dieSix", "ludoEnter"] },
      captured: {
        sounds: [["ludoHop", Math.round(0.78 * hopMs)], ["ludoHop", Math.round(1.78 * hopMs)], ["ludoCapture", 2 * hopMs]],
        felt: ["ludoCaptured"],
      },
      watching: [],
    });
  });
});
