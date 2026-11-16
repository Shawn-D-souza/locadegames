import { describe, expect, it } from "vitest";
import { gridFor, MEMORY_CONFIG } from "../src/shared/games/memory/config";
import { dealFace, pickFaces } from "../src/shared/games/memory/deal";
import { familyOf, groupOf, LOOKALIKES } from "../src/shared/games/memory/pictures";
import { applyMove, createGame, expire, finalPlaces, pairsOf, parseMove, quitSeat, view, winners, type MemoryFlip } from "../src/shared/games/memory/rules";
import type { MemoryState } from "../src/shared/games/memory/types";
import { claimPartyTimeout, partyDeadline, partyView, playPartyMove, quitParty, startParty } from "../src/shared/party/party";

const flip = (card: number, deal: MemoryFlip["deal"] = null): MemoryFlip => ({ card, deal });

/** Turns these cards, whoever's turn it is, each with its own random number. */
function play(state: MemoryState, cards: (number | MemoryFlip)[]): MemoryState {
  let next = state;
  for (const [i, card] of cards.entries()) {
    const result = applyMove(next, next.turn, typeof card === "number" ? flip(card) : card, 1_000 + i);
    if (!result.ok) throw new Error(`${JSON.stringify(card)}: ${result.error}`);
    next = result.state;
  }
  return next;
}

/** A game whose cards are already laid out: `layout[card]` is its face (as if every card had been turned once). */
function laidOut(players: number, layout: number[]): MemoryState {
  const state = createGame(players, 5);
  return { ...state, cards: layout, undealt: state.faces.map(() => 0) };
}

/** `count` cards laid out in pairs: card 2k and 2k + 1 are pair k. */
const paired = (count: number) => Array.from({ length: count }, (_, card) => Math.floor(card / 2));
/** 2 players: 30 cards. */
const PAIRED = paired(30);
/** The cards from `from` up to (not including) `to`, in order. */
const run = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

describe("memory board and pairs", () => {
  it("grows with the players: 2 → 6×5, 3–4 → 6×6, 5–8 → 6×7", () => {
    expect([2, 3, 4, 5, 6, 7, 8].map((n) => gridFor(n))).toEqual([
      { cols: 6, rows: 5 },
      { cols: 6, rows: 6 },
      { cols: 6, rows: 6 },
      { cols: 6, rows: 7 },
      { cols: 6, rows: 7 },
      { cols: 6, rows: 7 },
      { cols: 6, rows: 7 },
    ]);
  });

  it("picks every game's pairs by the rules: all different, about two thirds different pictures, one or two from a group, no lookalikes, a picture's colors far apart", () => {
    const broken: string[] = [];
    for (let seed = 0; seed < 400; seed++) {
      for (const pairs of [8, 15, 18, 21, 24]) {
        const faces = pickFaces(pairs, seed);
        const pictures = [...new Set(faces.map((f) => f.picture))];
        const groups = pictures.map(groupOf);
        const keys = new Set(faces.map((f) => `${f.picture}:${f.color}`));
        const families = pictures.map((p) => faces.filter((f) => f.picture === p).map((f) => familyOf(f.color)));
        if (faces.length !== pairs || keys.size !== pairs) broken.push(`${seed}/${pairs}: not ${pairs} different faces`);
        // Two thirds, unless the groups run out first (one or two from each, no lookalikes: at least 14 always fit).
        if (pictures.length !== Math.min(Math.ceil(pairs * MEMORY_CONFIG.pictureShare), Math.max(pictures.length, 14))) broken.push(`${seed}/${pairs}: ${pictures.length} pictures`);
        if (groups.some((g) => groups.filter((o) => o === g).length > MEMORY_CONFIG.perGroup)) broken.push(`${seed}/${pairs}: a group 3 times`);
        if (LOOKALIKES.some(([a, b]) => pictures.includes(a) && pictures.includes(b))) broken.push(`${seed}/${pairs}: lookalikes`);
        if (families.some((f) => f.length > 3 || new Set(f).size !== f.length)) broken.push(`${seed}/${pairs}: colors too close`);
        if (faces.some((f) => f.color === 11 || familyOf(f.color) === -1)) broken.push(`${seed}/${pairs}: a grey card`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("varies from game to game: every picture turns up, and a group gives two pictures", () => {
    const games = Array.from({ length: 50 }, (_, seed) => pickFaces(18, seed));
    const looks = new Set(games.map((faces) => faces.map((f) => `${f.picture}:${f.color}`).sort().join()));
    const pictures = new Set(games.flatMap((faces) => faces.map((f) => f.picture)));
    const twoFromAGroup = games.filter((faces) => {
      const groups = [...new Set(faces.map((f) => f.picture))].map(groupOf);
      return groups.some((g) => groups.filter((o) => o === g).length === 2);
    }).length;
    expect([looks.size, pictures.size, twoFromAGroup]).toEqual([50, 29, 50]);
  });

  it("deals each card from what's left, each card as likely", () => {
    const counts = [0, 0, 0];
    for (let seed = 0; seed < 3_000; seed++) counts[dealFace([2, 1, 0], seed)]! += 1;
    // Face 0 has two cards left, face 1 one, face 2 none.
    expect([counts[2], Math.abs(counts[0]! / counts[1]! - 2) < 0.25]).toEqual([0, true]);
  });
});

describe("memory rules", () => {
  it("turns a card face up, then a second: a miss passes the turn on, round every player", () => {
    let state = play(laidOut(3, paired(36)), [0]);
    expect([state.open, state.turn, state.lastMove]).toEqual([0, 0, { seat: 0, cards: [0], faces: [0], matched: false }]);
    state = play(state, [2]);
    expect([state.open, state.turn, state.lastMove, state.taken.every((t) => t === null)]).toEqual([null, 1, { seat: 0, cards: [0, 2], faces: [0, 1], matched: false }, true]);
    state = play(state, [4, 6, 8, 10]);
    expect(state.turn).toBe(0);
  });

  it("a pair is yours and you turn again", () => {
    const state = play(laidOut(2, PAIRED), [4, 5]);
    expect([state.taken[4], state.taken[5], state.turn, state.lastMove?.matched, pairsOf(state, 0)]).toEqual([0, 0, 0, true, 1]);
  });

  it("gives an unturned card its face the first time, and keeps it", () => {
    let state = play(createGame(2, 9), [3, 7]);
    const [three, seven] = [state.cards[3], state.cards[7]];
    const left = state.undealt.reduce((a, b) => a + b, 0);
    state = play(state, [3]);
    expect([three !== null, seven !== null, left, state.cards[3], state.undealt.reduce((a, b) => a + b, 0)]).toEqual([true, true, 28, three, 28]);
  });

  it("refuses the card already face up, a found card, someone else's turn, and a card off the board", () => {
    const state = play(laidOut(2, PAIRED), [0, 1, 4]);
    expect([applyMove(state, 0, flip(4), 0), applyMove(state, 0, flip(0), 0), applyMove(state, 1, flip(6), 0), applyMove(state, 0, flip(30), 0)].map((r) => !r.ok && r.error)).toEqual([
      "CELL_TAKEN",
      "CELL_TAKEN",
      "NOT_YOUR_TURN",
      "INVALID_MOVE",
    ]);
  });

  it("reads a move from the wire: a card number, or a loaded deal only on a dev server", () => {
    expect([parseMove(5, false), parseMove(-1, false), parseMove("5", false), parseMove({ card: 2, deal: "match" }, false), parseMove({ card: 2, deal: "match" }, true), parseMove({ card: 2, deal: "miss" }, true)]).toEqual([
      flip(5),
      null,
      null,
      null,
      flip(2, "match"),
      null,
    ]);
  });

  it("deals a playtest's loaded match, or a picture nobody has seen", () => {
    const state = play(createGame(2, 3), [0, flip(9, "match"), 2, flip(3, "new")]);
    const fresh = Array.from({ length: 30 }, (_, i) => applyMove(play(createGame(2, i), [0, 1]), 1, flip(2, "new"), i)).map((r) => r.ok && r.state);
    expect([state.taken[0], state.taken[9], state.cards[2] === state.cards[3], state.turn]).toEqual([0, 0, false, 1]);
    expect(fresh.every((s) => s && s.undealt[s.cards[2]!] === 1)).toBe(true);
  });

  it("ends once every pair is found; most pairs wins, and a tie shares the win", () => {
    // 15 pairs can't split evenly between two: seat 0 finds eight, misses, seat 1 finds the other seven.
    const won = play(laidOut(2, PAIRED), [...run(0, 16), 16, 18, ...run(16, 30)]);
    expect([won.over, won.turn, winners(won), finalPlaces(won).map((p) => [p.seat, p.place, p.score])]).toEqual([
      true,
      -1,
      [0],
      [
        [0, 1, 8],
        [1, 2, 7],
      ],
    ]);
    // 18 pairs between three, six each (one quit along the way would rank last): a shared win.
    const level = play(laidOut(3, paired(36)), [...run(0, 12), 12, 14, ...run(12, 24), 24, 26, ...run(24, 36)]);
    expect([level.over, [0, 1, 2].map((s) => pairsOf(level, s)), winners(level), finalPlaces(level).map((p) => p.place)]).toEqual([true, [6, 6, 6], [0, 1, 2], [1, 1, 1]]);
  });

  it("a quit turns the quitter's open card back, hands the turn on, keeps their pairs, and one left wins", () => {
    let state = play(laidOut(3, paired(36)), [0, 1, 2]);
    state = quitSeat(state, 0);
    expect([state.open, state.turn, pairsOf(state, 0)]).toEqual([null, 1, 1]);
    state = quitSeat(state, 2);
    expect([state.over, winners(state), finalPlaces(state).map((p) => [p.seat, p.place, p.quit])]).toEqual([
      true,
      [1],
      [
        [1, 1, false],
        [2, 2, true],
        [0, 3, true],
      ],
    ]);
  });

  it("a timeout turns a card in play for whoever's turn it is", () => {
    const state = play(laidOut(2, PAIRED), [0, 1, 2]);
    const results = Array.from({ length: 40 }, (_, seed) => expire(state, seed));
    const turned = results.map((r) => (r.ok ? r.state.lastMove!.cards[1]! : -1));
    expect([turned.every((card) => card > 2), new Set(turned).size > 4]).toEqual([true, true]);
  });

  it("shows phones only the cards face up, and nothing of what's left to turn", () => {
    const state = play(laidOut(2, PAIRED), [0, 1, 2, 4, 6]);
    const seen = view(state);
    expect([seen.cards.flatMap((f, card) => (f === null ? [] : [card])), seen.undealt, seen.lastMove?.faces]).toEqual([[0, 1, 6], [], [3]]);
  });
});

describe("memory in the party format", () => {
  it("starts the next card's clock once a card has turned, a pair has popped or a miss has shown and turned back", () => {
    const players = [
      { id: 0, name: "Ana", firsts: 0 },
      { id: 1, name: "Ben", firsts: 0 },
    ];
    let party = startParty("memory", players, 1_000, 7);
    const first = party.entrants[0]!.id;
    const step = (card: number | MemoryFlip, at: number) => {
      const moved = playPartyMove(party, first, typeof card === "number" ? card : card, at, 11, true);
      if (!moved.ok) throw new Error(moved.error);
      party = moved.party;
      return party.turnStartedAt - at;
    };
    const { flipMs, pairMs, missShowMs } = MEMORY_CONFIG;
    expect([step(0, 2_000), step({ card: 1, deal: "match" }, 3_000), step(2, 4_000), step({ card: 3, deal: "new" }, 5_000)]).toEqual([
      flipMs,
      flipMs + pairMs,
      flipMs,
      flipMs + missShowMs + flipMs,
    ]);
    // The room never shows a card face down, and a timeout turns one for the next player.
    const late = claimPartyTimeout(party, party.game.moves, partyDeadline(party), 3);
    expect([partyView(party).game.cards.filter((f) => f !== null).length, late.ok && late.party.game.moves]).toEqual([2, 5]);
  });

  it("a quit leaving one player ends the game with them as champion and everyone's pairs on the results", () => {
    const party = startParty("memory", [{ id: 0, name: "Ana", firsts: 0 }, { id: 1, name: "Ben", firsts: 0 }], 1_000, 7);
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
