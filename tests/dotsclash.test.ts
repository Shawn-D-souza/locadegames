import { describe, expect, it } from "vitest";
import { neighbours } from "../src/shared/games/dotsclash/board";
import { boardSizeFor, chainMs, DOTSCLASH_CONFIG } from "../src/shared/games/dotsclash/config";
import {
  applyMove,
  autoMove,
  autoPicks,
  canTap,
  chainFrames,
  createGame,
  finalPlaces,
  hidePicks,
  HIDDEN_PICK,
  quitSeat,
} from "../src/shared/games/dotsclash/rules";
import type { DotsClashState } from "../src/shared/games/dotsclash/types";
import { claimPartyTimeout, partyDeadline, partyView, playPartyMove, quitParty, startParty, turnOrder } from "../src/shared/party/party";

/** Each seat picks its cell, in seat order (a null skips that seat). */
function pick(state: DotsClashState, cells: (number | null)[]): DotsClashState {
  let next = state;
  cells.forEach((cell, seat) => {
    if (cell === null) return;
    const result = applyMove(next, seat, cell);
    if (!result.ok) throw new Error(`${seat}: ${result.error}`);
    next = result.state;
  });
  return next;
}

/** Taps in turn, whoever's turn it is. */
function play(state: DotsClashState, cells: number[]): DotsClashState {
  let next = state;
  for (const cell of cells) {
    const result = applyMove(next, next.turn, cell);
    if (!result.ok) throw new Error(`${cell}: ${result.error}`);
    next = result.state;
  }
  return next;
}

/** A 2-player game set up directly: these cells (seat, dots), seat 0 to move. */
function position(cells: Record<number, [seat: number, dots: number]>, players = 2): DotsClashState {
  const state = createGame(players);
  for (const [cell, [seat, dots]] of Object.entries(cells)) {
    state.owners[Number(cell)] = seat;
    state.dots[Number(cell)] = dots;
  }
  return { ...state, phase: "play", turn: 0 };
}

describe("dots clash board", () => {
  it("grows with the players: 2 → 6×6, 3–4 → 7×7, 5–6 → 8×8, 7–8 → 9×9", () => {
    expect([2, 3, 4, 5, 6, 7, 8].map(boardSizeFor)).toEqual([6, 7, 7, 8, 8, 9, 9]);
  });

  it("wraps, so every cell has four neighbours", () => {
    expect(neighbours(6, 0)).toEqual([30, 1, 6, 5]);
    expect(neighbours(6, 35)).toEqual([29, 30, 5, 34]);
  });
});

describe("dots clash rules", () => {
  it("starts with everyone picking at once, in secret; the starts appear together, then the first turn", () => {
    const partway = pick(createGame(3), [10, null, 20]);
    expect(partway.phase).toBe("pick");
    expect(partway.owners.every((owner) => owner === null)).toBe(true);
    expect(partway.moves).toBe(0);
    // Nobody else can see where: only who has picked.
    expect(hidePicks(partway).picks).toEqual([HIDDEN_PICK, null, HIDDEN_PICK]);
    const state = pick(partway, [null, 0]);
    expect(state.phase).toBe("play");
    expect(state.turn).toBe(0);
    expect(state.moves).toBe(1);
    expect(state.picks).toEqual([null, null, null]);
    expect([state.dots[10], state.dots[0], state.dots[20]]).toEqual([1, 1, 1]);
    expect([state.owners[10], state.owners[0], state.owners[20]]).toEqual([0, 1, 2]);
  });

  it("sends players who picked the same cell back to pick again, keeping the others' picks secret", () => {
    const clash = pick(createGame(3), [5, 5, 9]);
    expect(clash.phase).toBe("pick");
    expect(clash.moves).toBe(1);
    expect(clash.clashed).toEqual([true, true, false]);
    expect(clash.picks).toEqual([null, null, 9]);
    expect(clash.owners.every((owner) => owner === null)).toBe(true);
    const state = pick(clash, [5, 6]);
    expect(state.phase).toBe("play");
    expect([state.owners[5], state.owners[6], state.owners[9]]).toEqual([0, 1, 2]);
    expect(state.clashed).toEqual([false, false, false]);
  });

  it("refuses a second pick, a cell that isn't yours, and anyone out of turn", () => {
    const picking = pick(createGame(2), [0]);
    expect(applyMove(picking, 0, 5)).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    expect(canTap(picking, 0, 5)).toBe(false);
    expect(canTap(picking, 1, 5)).toBe(true);
    const playing = pick(picking, [null, 7]);
    expect(applyMove(playing, 0, 7)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(applyMove(playing, 0, 3)).toEqual({ ok: false, error: "INVALID_MOVE" });
    expect(canTap(playing, 0, 0)).toBe(true);
    expect(canTap(playing, 1, 7)).toBe(false);
  });

  it("explodes at 4 into the four neighbours, across the edges, taking the other player's dots", () => {
    // Seat 0 on the corner with 3; seat 1 next to it across the left edge, and far away.
    const state = position({ 0: [0, 3], 5: [1, 2], 21: [1, 1] });
    const after = play(state, [0]);
    expect(after.dots[0]).toBe(0);
    expect(after.owners[0]).toBeNull();
    for (const cell of [30, 1, 6]) expect([after.owners[cell], after.dots[cell]]).toEqual([0, 1]);
    expect([after.owners[5], after.dots[5]]).toEqual([0, 3]);
    expect(after.owners[21]).toBe(1);
    expect(after.turn).toBe(1);
  });

  it("chains wave by wave, every full cell bursting at once", () => {
    const state = position({ 0: [0, 3], 1: [0, 3], 21: [1, 1] });
    const frames = chainFrames(state, 0, 0);
    expect(frames[0]!.bursting).toEqual([0]);
    expect(frames[1]!.bursting).toEqual([1]);
    expect(frames.at(-1)!.bursting).toEqual([]);
    const after = play(state, [0]);
    expect(after.owners[0]).toBe(0);
    expect(after.dots[0]).toBe(1);
    expect(after.lastMove).toEqual({ seat: 0, cell: 0, waves: 2 });
  });

  it("puts out a player left without cells, and ends the game with the last one standing", () => {
    const state = position({ 0: [0, 3], 1: [1, 1] });
    const after = play(state, [0]);
    expect(after.over).toBe(true);
    expect(after.winner).toBe(0);
    expect(after.outAt[1]).toBe(1);
    expect(finalPlaces(after).map((p) => [p.seat, p.place])).toEqual([[0, 1], [1, 2]]);
  });

  it("shares a place between players knocked out by the same chain", () => {
    const state = position({ 0: [0, 3], 1: [1, 1], 6: [2, 1], 20: [3, 2] }, 4);
    const after = play(state, [0]);
    expect(after.over).toBe(false);
    const places = finalPlaces(after);
    expect(places.find((p) => p.seat === 1)!.place).toBe(3);
    expect(places.find((p) => p.seat === 2)!.place).toBe(3);
    expect(after.turn).toBe(3);
  });

  it("stops a chain once nobody else is left, even on a board that can't settle", () => {
    const size = boardSizeFor(2);
    const state = position({});
    state.owners.fill(0);
    state.dots.fill(3);
    state.owners[20] = 1;
    state.dots[20] = 1;
    const after = play(state, [0]);
    expect(after.over).toBe(true);
    expect(after.winner).toBe(0);
    expect(after.dots.length).toBe(size * size);
  });

  it("plays a timed-out turn for you: your fullest cell", () => {
    const playing = position({ 0: [0, 1], 7: [0, 2], 14: [0, 2], 30: [1, 1] });
    expect(autoMove(playing)).toBe(7);
  });

  it("picks for everyone who ran out of time, from the server's random number, never on a picked cell", () => {
    const picking = pick(createGame(3), [4]);
    const starts = (seed: number) => {
      const state = autoPicks(picking, seed);
      expect(state.phase).toBe("play");
      expect(state.owners[4]).toBe(0);
      const cells = [0, 1, 2].map((seat) => state.owners.indexOf(seat));
      expect(new Set(cells).size).toBe(3);
      return cells.join();
    };
    expect(starts(7)).toBe(starts(7));
    expect(new Set([1, 2, 3, 4, 5].map(starts)).size).toBeGreaterThan(1);
  });

  it("turns a quitter's cells grey: they stay, are skipped, and any explosion can take them", () => {
    const state = position({ 0: [0, 3], 1: [1, 2], 20: [2, 1] }, 3);
    const quit = quitSeat(state, 1);
    expect(quit.quit[1]).toBe(true);
    expect(quit.owners[1]).toBe(1);
    const after = play(quit, [0]);
    expect([after.owners[1], after.dots[1]]).toEqual([0, 3]);
    expect(after.turn).toBe(2);
  });

  it("ranks a later quit above an earlier knockout, even with no tap between them", () => {
    const knocked = play(position({ 0: [0, 3], 1: [1, 1], 20: [2, 1] }, 3), [0]);
    const after = quitSeat(knocked, 2);
    expect(finalPlaces(after).map((p) => [p.seat, p.place])).toEqual([[0, 1], [2, 2], [1, 3]]);
  });

  it("ends when everyone else quits", () => {
    const state = quitSeat(position({ 0: [0, 1], 9: [1, 1] }), 1);
    expect(state.over).toBe(true);
    expect(state.winner).toBe(0);
  });

  it("stops waiting for a quitter who hadn't picked yet", () => {
    const playing = quitSeat(pick(createGame(3), [0, null, 20]), 1);
    expect(playing.phase).toBe("play");
    expect(playing.turn).toBe(0);
    expect([playing.owners[0], playing.owners[20]]).toEqual([0, 2]);
    expect(playing.owners.includes(1)).toBe(false);
  });
});

describe("dots clash party", () => {
  const players = [0, 1, 2, 3].map((id) => ({ id, name: `P${id}`, firsts: 0 }));

  it("puts whoever went first least earlier, ties by the server's coin", () => {
    const order = turnOrder(
      players.map((p) => (p.id === 2 ? { ...p, firsts: 1 } : p)),
      12345,
    );
    expect(order.at(-1)!.id).toBe(2);
    const firsts = new Set(Array.from({ length: 40 }, (_, seed) => turnOrder(players, seed * 7919)[0]!.id));
    expect(firsts.size).toBe(4);
  });

  it("plays moves, refuses outsiders, and claims expired picks or turns only after the deadline", () => {
    const party = startParty("dotsclash", players.slice(0, 2), 1000, 1);
    const first = party.entrants[0]!.id;
    expect(playPartyMove(party, 7, 0, 1000, 0)).toEqual({ ok: false, error: "NOT_IN_MATCH" });
    const moved = playPartyMove(party, first, 3, 2000, 0);
    if (!moved.ok) throw new Error(moved.error);
    // One pick changes nothing for the others: the picks' clock runs on.
    expect(moved.party.turnStartedAt).toBe(1000);
    expect(partyView(moved.party).game.picks).toEqual([HIDDEN_PICK, null]);
    const early = claimPartyTimeout(moved.party, 0, partyDeadline(moved.party) - 1, 5);
    expect(early.ok).toBe(false);
    const at = partyDeadline(moved.party);
    const late = claimPartyTimeout(moved.party, 0, at, 5);
    if (!late.ok) throw new Error(late.error);
    expect(late.party.game.phase).toBe("play");
    expect(late.party.game.owners[3]).toBe(0);
    // The first turn's clock starts once the starts have landed.
    expect(late.party.turnStartedAt).toBe(at + chainMs(0));
    expect(claimPartyTimeout(late.party, 0, Infinity, 5).ok).toBe(false);
  });

  it("finishes with a ranking and the champion when the others quit", () => {
    const party = startParty("dotsclash", players.slice(0, 3), 0, 99);
    const [a, b, c] = party.entrants.map((e) => e.id);
    let p = party;
    for (const id of [b!, c!]) {
      const update = quitParty(p, id, 10);
      if (!update.ok) throw new Error(update.error);
      p = update.party;
    }
    expect(p.finished).toBe(true);
    expect(p.championIds).toEqual([a]);
    // The later quitter lasted longer.
    expect(p.results.map((r) => [r.id, r.place, r.quit])).toEqual([
      [a, 1, false],
      [c, 2, true],
      [b, 3, true],
    ]);
  });

  it("starts the next turn's clock only once the chain has played out on screen", () => {
    let p = startParty("dotsclash", players.slice(0, 2), 0, 1);
    const [a, b] = p.entrants.map((e) => e.id);
    // Picks side by side, then a fills to 3 and bursts into b's cell: a chain of two waves.
    for (const [id, cell] of [[a, 0], [b, 1], [a, 0], [b, 1], [a, 0], [b, 1], [a, 0]] as const) {
      const update = playPartyMove(p, id!, cell, 5_000, 0);
      if (!update.ok) throw new Error(update.error);
      p = update.party;
    }
    const waves = p.game.lastMove!.waves;
    expect(waves).toBeGreaterThan(0);
    expect(p.turnStartedAt).toBe(5_000 + DOTSCLASH_CONFIG.landMs + waves * DOTSCLASH_CONFIG.waveMs);
  });

  it("keeps the turn time from the config", () => {
    const party = startParty("dotsclash", players.slice(0, 2), 0, 1);
    expect(partyDeadline(party)).toBe(DOTSCLASH_CONFIG.turnTimeMs);
  });
});
