import { describe, expect, it } from "vitest";
import { POOL_CONFIG, shotMs } from "../src/shared/games/pool/config";
import { simulate } from "../src/shared/games/pool/physics";
import { rack } from "../src/shared/games/pool/rack";
import { applyMove, ballsLeft, createGame, expire, finalPlaces, parseMove, quitSeat } from "../src/shared/games/pool/rules";
import type { PoolShotResult, PoolState } from "../src/shared/games/pool/types";
import { claimPartyTimeout, partyDeadline, playPartyMove, startParty } from "../src/shared/party/party";
import { shotCues } from "../src/web/games/pool/shotCues";
import { shotFrames } from "../src/web/games/pool/shotFrames";
import { onCue, pullingBack, pullOf, turnBy } from "../src/web/games/pool/cueGrip";
import { POOL_LOOK } from "../src/web/games/pool/look";
import { fitView, toTable } from "../src/web/games/pool/tableView";

const { width: W, footSpotX } = POOL_CONFIG.table;

/** A 2-player game with the balls placed: `spots` by ball index (0 the cue ball, 1 the black, 2–8 seat 0's, 9–15 seat 1's); the rest in a row along the top rail, out of the way. */
function placed(spots: Record<number, [number, number] | null>, players = 2, broken = true): PoolState {
  const game = createGame(players, 7);
  const balls = game.balls.map((b, i) => {
    const spot = spots[i];
    if (spot === null) return { ...b, on: false };
    return spot ? { ...b, x: spot[0], y: spot[1] } : { ...b, x: 8 + i * 5, y: W - POOL_CONFIG.ballRadius - 0.5 };
  });
  return { ...game, balls, broken };
}

/** A straight shot from the cue ball toward `x, y`. */
function toward(state: PoolState, x: number, y: number, power = 0.6) {
  const cue = state.balls[0]!;
  const dx = x - cue.x;
  const dy = y - cue.y;
  const length = Math.hypot(dx, dy);
  return { shot: { dx: dx / length, dy: dy / length, power }, table: null };
}

function shoot(state: PoolState, x: number, y: number, power = 0.6): PoolState {
  const result = applyMove(state, state.turn, toward(state, x, y, power));
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

const lastShot = (state: PoolState) => state.last as PoolShotResult;
/** A line from the cue ball at (70, 15) through (90, 5) runs into the bottom right corner pocket. */
const CORNER: [number, number] = [100, 0];
const ON_THE_LINE: [number, number] = [90, 5];
const CUE_SPOT: [number, number] = [70, 15];

describe("pool rack", () => {
  it("has the black in the middle, 7 each for 2 players and 4 or 3 for 3 or 4 (13 balls), none touching, in an order from the seed", () => {
    const touching = (players: number) => {
      const balls = rack(players, 3);
      return balls.some((a, i) => balls.some((b, j) => j > i && Math.hypot(a.x - b.x, a.y - b.y) < 2 * POOL_CONFIG.ballRadius));
    };
    const spots = (players: number, seed: number) => rack(players, seed).map((b) => [b.owner, b.x, b.y]);
    expect({
      counts: [2, 3, 4].map((players) => rack(players, 1).length),
      each: [2, 3, 4].map((players) => ballsLeft(createGame(players, 1), players - 1)),
      black: rack(2, 1)[1],
      touching: [2, 3, 4].map(touching),
      seeded: JSON.stringify(spots(4, 1)) === JSON.stringify(spots(4, 1)) && JSON.stringify(spots(4, 1)) !== JSON.stringify(spots(4, 2)),
    }).toEqual({
      counts: [16, 14, 14],
      each: [7, 4, 3],
      black: { owner: "black", x: footSpotX + 2 * ((2 * POOL_CONFIG.ballRadius + POOL_CONFIG.rackGap) * Math.sqrt(3)) / 2, y: W / 2, on: true },
      touching: [false, false, false],
      seeded: true,
    });
  });
});

describe("pool physics", () => {
  it("plays a shot the same every time, also from the balls as the wire carries them", () => {
    const balls = rack(4, 9);
    const shot = { dx: 0.999, dy: 0.0447, power: 1 };
    const wired = JSON.parse(JSON.stringify({ balls, shot }));
    expect(simulate(wired.balls, wired.shot)).toEqual(simulate(balls, shot));
  });

  it("stops every ball, keeps them on the table or pots them, and a hard break lasts a few seconds", () => {
    const { balls, outcome } = simulate(rack(2, 4), { dx: 1, dy: 0.01, power: 1 });
    const inside = balls.every((b) => !b.on || (b.x >= 0 && b.x <= POOL_CONFIG.table.length && b.y >= 0 && b.y <= W));
    const seconds = outcome.steps / POOL_CONFIG.physics.stepsPerSecond;
    expect({ inside, firstHit: outcome.firstHit !== null, lasts: seconds > 2 && seconds < POOL_CONFIG.physics.maxSeconds }).toEqual({ inside: true, firstHit: true, lasts: true });
  });
});

describe("pool rules", () => {
  it("one of yours in, no foul: shoot again", () => {
    const after = shoot(placed({ 0: CUE_SPOT, 2: ON_THE_LINE }), ...CORNER);
    expect({ potted: lastShot(after).potted, again: lastShot(after).again, turn: after.turn, left: ballsLeft(after, 0) }).toEqual({ potted: [2], again: true, turn: 0, left: 6 });
  });

  it("the break may touch any ball first; someone else's going in stays down and the turn passes", () => {
    const after = shoot(placed({ 0: CUE_SPOT, 9: ON_THE_LINE }, 2, false), ...CORNER);
    expect({ foul: lastShot(after).foul, breakShot: lastShot(after).breakShot, again: lastShot(after).again, turn: after.turn, theirs: ballsLeft(after, 1) }).toEqual({
      foul: null,
      breakShot: true,
      again: false,
      turn: 1,
      theirs: 6,
    });
  });

  it("fouls pass the turn: someone else's ball first, no ball touched, the cue ball in (it goes back where it was)", () => {
    const wrong = shoot(placed({ 0: CUE_SPOT, 9: ON_THE_LINE }), ...CORNER);
    const none = shoot(placed({ 0: [50, 25] }), 50, 0, 0.1);
    const scratch = shoot(placed({ 0: [90, 10] }), ...CORNER);
    expect({
      wrong: [lastShot(wrong).foul, lastShot(wrong).again, wrong.turn],
      none: [lastShot(none).foul, none.turn],
      scratch: [lastShot(scratch).foul, scratch.turn, scratch.balls[0]],
    }).toEqual({
      wrong: ["wrongBall", false, 1],
      none: ["noHit", 1],
      scratch: ["scratch", 1, { owner: "cue", x: 90, y: 10, on: true }],
    });
  });

  it("the black in before your balls puts you out: your balls leave, the black goes back on its spot, and with 2 the other wins", () => {
    const three = shoot(placed({ 0: CUE_SPOT, 1: ON_THE_LINE }, 3), ...CORNER);
    const two = shoot(placed({ 0: CUE_SPOT, 1: ON_THE_LINE }), ...CORNER);
    expect({
      out: [lastShot(three).out, three.outOrder, ballsLeft(three, 0), three.turn, three.over],
      black: three.balls[1],
      two: [two.over, two.winner],
    }).toEqual({
      out: [true, [0], 0, 1, false],
      black: { owner: "black", x: footSpotX, y: W / 2, on: true },
      two: [true, 1],
    });
  });

  it("the black in after all of yours wins; knocked in off someone else's ball (a foul) puts you out instead", () => {
    const clear = Object.fromEntries([2, 3, 4, 5, 6, 7, 8].map((i) => [i, null]));
    const win = shoot(placed({ ...clear, 0: CUE_SPOT, 1: ON_THE_LINE }), ...CORNER);
    const foul = shoot(placed({ ...clear, 0: CUE_SPOT, 9: [82, 9], 1: ON_THE_LINE }), ...CORNER, 0.9);
    expect({ win: [lastShot(win).won, win.over, win.winner], foul: [lastShot(foul).foul, lastShot(foul).out, foul.winner] }).toEqual({
      win: [true, true, 0],
      foul: ["wrongBall", true, 1],
    });
  });

  it("a turn that runs out passes with no foul; quits take a player's balls off, and the last one left wins", () => {
    const timedOut = expire(createGame(3, 1));
    const quit = quitSeat(createGame(3, 1), 1);
    const last = quitSeat(quit, 2);
    expect({
      timeout: timedOut.ok && [timedOut.state.turn, timedOut.state.moves, timedOut.state.last],
      quit: [quit.turn, ballsLeft(quit, 1), quit.over],
      last: [last.over, last.winner],
    }).toEqual({ timeout: [1, 1, { kind: "timeout", seat: 0, missed: 1, out: false }], quit: [0, 0, false], last: [true, 0] });
  });

  it("three turns run out in a row put you out as if you'd quit; a shot in between starts the count again", () => {
    const expired = (state: PoolState) => (expire(state) as { state: PoolState }).state;
    // Seat 0 and seat 1 both away: their 3rd miss in a row puts seat 0 out, and seat 1 is left to win.
    const twoRounds = expired(expired(expired(expired(createGame(2, 1)))));
    const third = expired(twoRounds);
    // Seat 0 shoots after two misses: the count starts again.
    const shot = shoot(twoRounds, 75, 25, 0.3);
    expect({
      third: [third.last, third.quitOrder, ballsLeft(third, 0), third.over, third.winner],
      reset: [shot.missed[0], shot.quitOrder],
    }).toEqual({ third: [{ kind: "timeout", seat: 0, missed: 3, out: true }, [0], 0, true, 1], reset: [0, []] });
  });

  it("ranks the winner, then whoever is in by fewest balls left (level ones share), then those out by the black, then quitters", () => {
    const state: PoolState = { ...placed({ 2: null, 3: null }, 4), winner: 0, over: true, turn: -1, outOrder: [], quitOrder: [] };
    const balls = state.balls.map((b) => (b.owner === 2 ? { ...b, on: false } : b));
    const ranked = finalPlaces({ ...state, balls: balls.map((b, i) => (b.owner === 1 && i === 5 ? { ...b, on: false } : b)), outOrder: [3] });
    expect(ranked).toEqual([
      { seat: 0, place: 1, quit: false },
      { seat: 2, place: 2, quit: false },
      { seat: 1, place: 3, quit: false },
      { seat: 3, place: 4, quit: false },
    ]);
  });

  it("takes only a real shot from the wire, as a unit vector, and a placed table only on a dev server", () => {
    expect([
      parseMove({ dx: 3, dy: 4, power: 0.5 }),
      parseMove({ dx: 0, dy: 0, power: 0.5 }),
      parseMove({ dx: 1, dy: 0, power: 2 }),
      parseMove("roll"),
      parseMove({ dx: 1, dy: 0, power: 0.5, table: [[1, 2, true]] }, false)?.table,
      parseMove({ dx: 1, dy: 0, power: 0.5, table: [[1, 2, true]] }, true)?.table,
    ]).toEqual([{ shot: { dx: 0.6, dy: 0.8, power: 0.5 }, table: null }, null, null, null, null, [[1, 2, true]]]);
  });
});

describe("pool as a party game", () => {
  it("racks from the server's number, starts the next turn's clock once the shot has played out, and passes a turn that ran out", () => {
    const players = [0, 1, 2].map((id) => ({ id, name: `P${id}`, firsts: 0 }));
    const party = startParty("pool", players, 1_000, 99);
    const breaker = party.entrants[0]!.id;
    const shot = playPartyMove(party, breaker, { dx: 1, dy: 0.003, power: 1 }, 2_000, 0);
    if (!shot.ok) throw new Error(shot.error);
    const steps = lastShot(shot.party.game).steps;
    const late = claimPartyTimeout(shot.party, 1, partyDeadline(shot.party), 0);
    expect({
      sameRack: JSON.stringify(startParty("pool", players, 1_000, 99).game.balls) === JSON.stringify(party.game.balls),
      clock: shot.party.turnStartedAt - 2_000 === shotMs(steps),
      timeout: late.ok && late.party.game.last?.kind,
    }).toEqual({ sameRack: true, clock: true, timeout: "timeout" });
  });
});

describe("pool on screen", () => {
  it("plays a shot again to exactly where the server left the balls, with its drops", () => {
    const after = shoot(placed({ 0: CUE_SPOT, 2: ON_THE_LINE }), ...CORNER);
    const frames = shotFrames(lastShot(after));
    const end = frames.x.length - 1;
    const atEnd = after.balls.every((b, i) => !b.on || (Math.abs(frames.x[end]![i]! - b.x) < 1e-3 && Math.abs(frames.y[end]![i]! - b.y) < 1e-3));
    expect({ atEnd, drops: frames.drops.map((d) => [d.ball, d.pocket]) }).toEqual({ atEnd: true, drops: [[2, 1]] });
  });

  it("times the strike to the end of the lead, a drop's sounds to the drop, and keeps a break's clicks few", () => {
    const after = shoot(placed({ 0: CUE_SPOT, 2: ON_THE_LINE }), ...CORNER);
    const shot = lastShot(after);
    const frames = shotFrames(shot);
    const mine = shotCues(shot, frames, "mine", 0);
    const breakShot = applyMove(createGame(2, 5), 0, { shot: { dx: 1, dy: 0.01, power: 1 }, table: null });
    if (!breakShot.ok) throw new Error(breakShot.error);
    const breakCues = shotCues(lastShot(breakShot.state), shotFrames(lastShot(breakShot.state)), "watching", null);
    const drop = POOL_CONFIG.leadMs + frames.drops[0]!.ms;
    expect({
      strike: mine.sounds[0],
      pocket: mine.sounds.some((s) => s.sound === "poolPocket" && s.at === drop),
      potted: mine.haptics.map((h) => h.haptic),
      clicks: breakCues.sounds.filter((s) => s.sound === "poolClack" || s.sound === "poolCushion").length <= 28,
      unfelt: breakCues.haptics,
    }).toEqual({
      strike: { sound: "poolStrike", at: POOL_CONFIG.leadMs, variant: 1, volume: 1 },
      pocket: true,
      potted: ["poolStrike", "poolPotted"],
      clicks: true,
      unfelt: [],
    });
  });

  it("takes hold of the cue on the cue ball or along the stick, turns it by a finger's sweep round the ball, and pulls only straight back", () => {
    const ball = { x: 30, y: 25 };
    const aim = { dx: 1, dy: 0 };
    const round = (a: { dx: number; dy: number } | null) => a && { dx: Math.round(a.dx * 1e6) / 1e6 + 0, dy: Math.round(a.dy * 1e6) / 1e6 + 0 };
    expect({
      grips: [onCue(ball, aim, { x: 31, y: 26 }), onCue(ball, aim, { x: 10, y: 27 }), onCue(ball, aim, { x: 50, y: 25 }), onCue(ball, aim, { x: 10, y: 35 })],
      // A quarter turn swept on the stick's side, and the same swept in front of the ball: the same turn; right by the ball, none.
      turns: [round(turnBy(aim, ball, { x: 20, y: 25 }, { x: 30, y: 15 })), round(turnBy(aim, ball, { x: 40, y: 25 }, { x: 30, y: 35 })), turnBy(aim, ball, { x: 31, y: 25 }, { x: 30, y: 35 })],
      tell: [pullingBack(aim, { x: 20, y: 25 }, { x: 17, y: 26 }), pullingBack(aim, { x: 20, y: 25 }, { x: 19, y: 28 }), pullingBack(aim, { x: 20, y: 25 }, { x: 23, y: 25 })],
      pull: [pullOf(aim, { x: 30, y: 25 }, { x: 30 - POOL_LOOK.fullPull / 2, y: 30 }), pullOf(aim, { x: 30, y: 25 }, { x: 30 + POOL_LOOK.fullPull / 2, y: 25 }), pullOf(aim, { x: 30, y: 25 }, { x: -100, y: 25 })],
    }).toEqual({
      grips: [true, true, false, false],
      turns: [{ dx: 0, dy: 1 }, { dx: 0, dy: 1 }, null],
      tell: [true, false, false],
      pull: [0.5, 0, 1],
    });
  });

  it("turns a touch on the table, standing up or lying down, back into table units", () => {
    const portrait = fitView(300, 600, true);
    const landscape = fitView(600, 300, false);
    const s = portrait.scale;
    const round = (p: { x: number; y: number }) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
    expect([round(toTable(portrait, (POOL_LOOK.rail + 10) * s, (POOL_LOOK.rail + 100 - 20) * s)), round(toTable(landscape, (POOL_LOOK.rail + 20) * landscape.scale, (POOL_LOOK.rail + 10) * landscape.scale))]).toEqual([
      { x: 20, y: 10 },
      { x: 20, y: 10 },
    ]);
  });
});
