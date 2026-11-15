import { describe, expect, it } from "vitest";
import { POCKETS, sideOf, startingCoins, strikerFits, strikerSpot } from "../src/shared/games/carrom/board";
import { CARROM_CONFIG, shotMs } from "../src/shared/games/carrom/config";
import { simulate } from "../src/shared/games/carrom/physics";
import { applyMove, createGame, expire, finalPlaces, parseMove, quitSeat, QUEEN, winners } from "../src/shared/games/carrom/rules";
import type { CarromShotResult, CarromState } from "../src/shared/games/carrom/types";
import { partyDeadline, playPartyMove, startParty } from "../src/shared/party/party";
import { fitView, toBoard, toScreen } from "../src/web/games/carrom/boardView";
import { localMs, shownMs } from "../src/web/games/carrom/playbackClock";
import { shotCues } from "../src/web/games/carrom/shotCues";
import { shotFrames } from "../src/web/games/carrom/shotFrames";
import { forwardAim, holdIntent, nearestFit, slideTo, slingOf } from "../src/web/games/carrom/strikerGrip";

const { coinRadius: RC, points, foulPenalty } = CARROM_CONFIG;
/** Coins: 0 the queen, 1–9 white, 10–18 black. */
const WHITE = 1;
const BLACK = 10;
/** Side 0's striker at the left end of its baseline, and the top left hole. */
const AT = -30;
const TOP_LEFT = POCKETS[0]!;
/** Where coins nobody needs wait, out of every shot's way: along the right wall. */
const PARKED = (i: number): [number, number] => [96, 20 + i * 4.8];

/** A game with the coins placed: `spots` by coin index (null: already in); every other coin parked along the right wall. */
function placed(spots: Record<number, [number, number] | null>, players = 2): CarromState {
  const game = createGame(players);
  const coins = game.coins.map((c, i) => {
    const spot = spots[i];
    if (spot === null) return { ...c, on: false };
    const [x, y] = spot ?? PARKED(i - (i > 9 ? 4 : 0));
    return { ...c, x, y };
  });
  return { ...game, coins };
}

/** The striker from `at` on side 0, flicked straight at `x, y`. */
function toward(at: number, x: number, y: number, power = 0.42) {
  const from = strikerSpot(0, at);
  const dx = x - from.x;
  const dy = y - from.y;
  const length = Math.hypot(dx, dy);
  return { shot: { at, dx: dx / length, dy: dy / length, power }, table: null };
}

/** A coin on the way from side 0's striker at `AT` to the top left hole, `share` of the way along. */
function onTheWay(share = 0.75): [number, number] {
  const from = strikerSpot(0, AT);
  return [from.x + (TOP_LEFT.x - from.x) * share, from.y + (TOP_LEFT.y - from.y) * share];
}

function shoot(state: CarromState, move = toward(AT, TOP_LEFT.x, TOP_LEFT.y)): CarromState {
  const result = applyMove(state, state.turn, move);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

const lastShot = (state: CarromState) => state.last as CarromShotResult;

describe("carrom board", () => {
  it("starts with the queen in the middle, 9 white and 9 black round her, none touching, and the striker's spots on each side", () => {
    const coins = startingCoins();
    const touching = coins.some((a, i) => coins.some((b, j) => j > i && Math.hypot(a.x - b.x, a.y - b.y) < 2 * RC));
    expect({
      kinds: coins.map((c) => c.kind).join(",").replace(/white/g, "w").replace(/black/g, "b"),
      queen: [coins[QUEEN]!.x, coins[QUEEN]!.y],
      touching,
      spots: ([0, 1, 2, 3] as const).map((side) => strikerSpot(side, 0)),
      sides: [sideOf(2, 0), sideOf(2, 1), sideOf(3, 2), sideOf(4, 3)],
      clearAtStart: strikerFits(coins, 0, 0),
    }).toEqual({
      kinds: ["queen", ..."wwwwwwwww", ..."bbbbbbbbb"].join(","),
      queen: [50, 50],
      touching: false,
      spots: [
        { x: 50, y: 85 },
        { x: 85, y: 50 },
        { x: 50, y: 15 },
        { x: 15, y: 50 },
      ],
      sides: [0, 2, 2, 3],
      clearAtStart: true,
    });
  });
});

describe("carrom physics", () => {
  it("plays a shot the same every time, also from a copy that went through JSON, and a break scatters the coins", () => {
    const coins = startingCoins();
    const shot = { at: 3, dx: -0.05 / Math.hypot(0.05, 1), dy: -1 / Math.hypot(0.05, 1), power: 1 };
    const a = simulate(coins, 0, shot);
    const b = simulate(JSON.parse(JSON.stringify(coins)), 0, JSON.parse(JSON.stringify(shot)));
    const moved = a.coins.filter((c, i) => Math.hypot(c.x - coins[i]!.x, c.y - coins[i]!.y) > 5).length;
    expect({ same: JSON.stringify(a) === JSON.stringify(b), scattered: moved > 8, seconds: a.outcome.steps / CARROM_CONFIG.physics.stepsPerSecond < 6 }).toEqual({
      same: true,
      scattered: true,
      seconds: true,
    });
  });
});

describe("carrom holes", () => {
  it("a disc reaching a hole fast and off-centre clips the rim and bounces out; dead centre, or not so fast, it drops", () => {
    const empty = startingCoins().map((c) => ({ ...c, on: false }));
    const from = strikerSpot(0, AT);
    // The striker flicked toward a point `off` units to one side of the top left hole's middle.
    const dropped = (off: number, power: number) => {
      const dx = TOP_LEFT.x + off * Math.SQRT1_2 - from.x;
      const dy = TOP_LEFT.y - off * Math.SQRT1_2 - from.y;
      const length = Math.hypot(dx, dy);
      return simulate(empty, 0, { at: AT, dx: dx / length, dy: dy / length, power }).outcome.strikerIn;
    };
    expect({ centreHard: dropped(0, 1), offCentreSoft: dropped(2.2, 0.5), offCentreHard: dropped(2.2, 1) }).toEqual({
      centreHard: true,
      offCentreSoft: true,
      offCentreHard: false,
    });
  });
});

describe("carrom rules", () => {
  it("a coin in scores its points (white 20, black 10) and you shoot again", () => {
    const white = shoot(placed({ [WHITE]: onTheWay() }));
    const black = shoot(placed({ [BLACK]: onTheWay() }));
    expect({
      white: [lastShot(white).pocketed, white.scores, white.turn, lastShot(white).again],
      black: [lastShot(black).pocketed, black.scores],
    }).toEqual({
      white: [[WHITE], [points.white, 0], 0, true],
      black: [[BLACK], [points.black, 0]],
    });
  });

  it("the striker in is a foul: -10 (below 0 too), the coins that went in with it go back, the turn passes", () => {
    const alone = shoot(placed({}), toward(AT, TOP_LEFT.x, TOP_LEFT.y, 0.9));
    // A coin on the way and the striker following it in.
    const withCoin = shoot(placed({ [WHITE]: onTheWay(0.9) }), toward(AT, TOP_LEFT.x, TOP_LEFT.y, 1));
    expect({
      alone: [lastShot(alone).foul, alone.scores, alone.turn],
      withCoin: [lastShot(withCoin).strikerIn, lastShot(withCoin).returned, withCoin.coins[WHITE]!.on, withCoin.scores[0]],
    }).toEqual({
      alone: [true, [-foulPenalty, 0], 1],
      withCoin: [true, [WHITE], true, -foulPenalty],
    });
  });

  it("the queen counts only once covered: in with a coin at once, or by a coin on the next shot; else she goes back", () => {
    const queenAlone = shoot(placed({ [QUEEN]: onTheWay() }));
    const covered = shoot({ ...queenAlone, coins: placed({ [QUEEN]: null, [WHITE]: onTheWay() }).coins });
    const missed = shoot({ ...queenAlone, coins: placed({ [QUEEN]: null }).coins }, toward(AT, 50, 50, 0.3));
    // The queen and a white in on the same shot: two coins in a row on the way.
    const both = shoot(placed({ [QUEEN]: onTheWay(0.85), [WHITE]: onTheWay(0.7) }), toward(AT, TOP_LEFT.x, TOP_LEFT.y, 0.6));
    expect({
      queenAlone: [lastShot(queenAlone).queen, queenAlone.queenDue, queenAlone.scores[0], queenAlone.turn],
      covered: [lastShot(covered).queen, covered.scores[0], covered.queenDue],
      missed: [lastShot(missed).queen, missed.coins[QUEEN]!.on, missed.coins[QUEEN]!.x, missed.scores[0], missed.turn],
      both: [lastShot(both).queen, both.scores[0]],
    }).toEqual({
      queenAlone: ["pocketed", 0, 0, 0],
      covered: ["covered", points.white + points.queen, null],
      missed: ["returned", true, 50, 0, 1],
      both: ["covered", points.white + points.queen],
    });
  });

  it("refuses a striker on a coin, past its baseline's end, or flicked backwards", () => {
    const state = placed({ [WHITE]: [50, 85] });
    expect({
      onCoin: applyMove(state, 0, toward(0, 50, 50)),
      past: parseMove({ at: 31, dx: 0, dy: -1, power: 1 }),
      backwards: applyMove(state, 0, { shot: { at: AT, dx: 0, dy: 1, power: 1 }, table: null }),
      notYours: applyMove(state, 1, toward(AT, 50, 50)),
      normalised: parseMove({ at: 2, dx: 0, dy: -3, power: 2 }),
    }).toEqual({
      onCoin: { ok: false, error: "INVALID_MOVE" },
      past: null,
      backwards: { ok: false, error: "INVALID_MOVE" },
      notYours: { ok: false, error: "NOT_YOUR_TURN" },
      normalised: null,
    });
  });

  it("the board ends once every coin is in: most points wins, level players share it, quitters last", () => {
    const last = shoot(placed(Object.fromEntries([...Array(19).keys()].map((i) => [i, i === WHITE ? onTheWay() : null]))));
    const level: CarromState = { ...createGame(3), scores: [40, 40, 10], quitOrder: [], over: true };
    const quit = quitSeat({ ...createGame(3), scores: [10, 50, 30] }, 1);
    expect({
      over: [last.over, last.turn, winners(last)],
      level: [finalPlaces(level), winners(level)],
      quit: [quit.over, quit.turn, finalPlaces({ ...quit, over: true }).map((p) => [p.seat, p.place, p.quit])],
    }).toEqual({
      over: [true, -1, [0]],
      level: [
        [
          { seat: 0, place: 1, quit: false, score: 40 },
          { seat: 1, place: 1, quit: false, score: 40 },
          { seat: 2, place: 3, quit: false, score: 10 },
        ],
        [0, 1],
      ],
      quit: [
        false,
        0,
        [
          [2, 1, false],
          [0, 2, false],
          [1, 3, true],
        ],
      ],
    });
  });

  it("a turn run out passes on (the queen waiting to be covered goes back); three in a row puts you out", () => {
    const queenDue = shoot(placed({ [QUEEN]: onTheWay() }));
    const timedOut = expire(queenDue);
    let state = createGame(2);
    for (let i = 0; i < 5; i++) state = (expire(state) as { state: CarromState }).state;
    expect({
      queen: [timedOut.ok && timedOut.state.turn, timedOut.ok && timedOut.state.coins[QUEEN]!.on, timedOut.ok && timedOut.state.queenDue],
      three: [state.over, state.quitOrder],
    }).toEqual({ queen: [1, true, null], three: [true, [0]] });
  });

  it("starts the next turn's clock once the shot has played out", () => {
    const party = startParty("carrom", [{ id: 0, name: "Ana", firsts: 0 }, { id: 1, name: "Ben", firsts: 0 }], 1_000, 7);
    const shooter = party.entrants[0]!.id;
    const result = playPartyMove(party, shooter, { at: 0, dx: 0, dy: -1, power: 1 }, 2_000, 0);
    if (!result.ok) throw new Error(result.error);
    const steps = lastShot(result.party.game).steps;
    expect(partyDeadline(result.party)).toBe(2_000 + shotMs(steps) + CARROM_CONFIG.turnTimeMs);
  });
});

describe("carrom on the phones", () => {
  it("frames end where the server's coins did, and cues follow what the shot did", () => {
    const state = shoot(placed({ [WHITE]: onTheWay() }));
    const shot = lastShot(state);
    const frames = shotFrames(shot);
    const end = shot.before.map((_, i) => [frames.x.at(-1)![i + 1], frames.y.at(-1)![i + 1], frames.on.at(-1)![i + 1] === 1]);
    const server = state.coins.map((c) => [Math.fround(c.x), Math.fround(c.y), c.on]);
    const foul = lastShot(shoot(placed({}), toward(AT, TOP_LEFT.x, TOP_LEFT.y, 0.9)));
    const names = (cues: ReturnType<typeof shotCues>) => cues.sounds.map((s) => s.sound).filter((s) => s !== "carromClack" && s !== "carromWall");
    expect({
      end: JSON.stringify(end) === JSON.stringify(server),
      mine: names(shotCues(shot, frames, "mine")),
      theirs: names(shotCues(shot, frames, "theirs")),
      felt: shotCues(shot, frames, "mine").haptics.map((h) => h.haptic),
      foul: names(shotCues(foul, shotFrames(foul), "mine")),
    }).toEqual({
      end: true,
      mine: ["carromFlick", "carromPocket", "carromScored"],
      theirs: ["carromFlick", "carromPocket"],
      felt: ["carromFlick", "carromScored"],
      foul: ["carromFlick", "carromPocket", "carromFoul"],
    });
  });

  it("someone else's shot catches up with the shooter's and then keeps pace; your own plays as it is", () => {
    const lag = 120;
    const caughtUpAt = lag / (1.35 - 1);
    const samples = [0, 100, caughtUpAt, caughtUpAt + 500].map((elapsed) => shownMs(elapsed, lag));
    const roundTrip = [50, 300, 800, 2_000].every((ms) => Math.abs(shownMs(localMs(ms, lag), lag) - ms) < 1e-9);
    expect({
      own: shownMs(500, 0),
      faster: samples[1]! > 100 && samples[1]! < 100 + lag,
      level: [samples[2]! - caughtUpAt, samples[3]! - (caughtUpAt + 500)].map((d) => Math.round(d)),
      roundTrip,
      wokeUp: shownMs(0, 5_000),
    }).toEqual({ own: 500, faster: true, level: [lag, lag], roundTrip: true, wokeUp: 5_000 });
  });

  it("the striker slides past coins, flicks the opposite way to any pull (forward only), and the board turns your side to the bottom", () => {
    const coins = placed({ [WHITE]: [50, 85] }).coins;
    const view = fitView(500, 800, 1);
    const roundTrip = [
      [10, 20],
      [90, 70],
    ].every(([x, y]) => {
      const p = toScreen(view, x!, y!);
      const back = toBoard(view, p.x, p.y);
      return Math.abs(back.x - x!) < 1e-9 && Math.abs(back.y - y!) < 1e-9;
    });
    const mySpot = toScreen(view, 85, 50);
    // Pulled down and to the left: it goes up and to the right, as hard as the pull is long.
    const diagonal = slingOf(0, { x: 50, y: 85 }, { x: 44, y: 93 })!;
    expect({
      slide: slideTo(coins, 0, { x: 51, y: 85 })! > 0 && Math.abs(slideTo(coins, 0, { x: 51, y: 85 })!) >= RC + CARROM_CONFIG.strikerRadius,
      nearest: nearestFit(placed({}).coins, 0, 0),
      intents: [
        holdIntent(0, { x: 50, y: 85 }, { x: 50, y: 90 }, true),
        holdIntent(0, { x: 50, y: 85 }, { x: 55, y: 85 }, true),
        holdIntent(0, { x: 50, y: 85 }, { x: 55, y: 85 }, false),
        holdIntent(0, { x: 50, y: 85 }, { x: 53, y: 89 }, true),
      ],
      backwardsKept: forwardAim({ dx: 0.6, dy: 0.8 }, 0).dy <= -CARROM_CONFIG.forwardMin + 1e-12,
      diagonal: [Math.round(diagonal.aim.dx * 10) / 10, Math.round(diagonal.aim.dy * 10) / 10, Math.round(diagonal.power * 100) / 100],
      fullAndMore: slingOf(0, { x: 50, y: 85 }, { x: 50, y: 150 })!.power,
      tooShort: slingOf(0, { x: 50, y: 85 }, { x: 50, y: 85.5 }),
      roundTrip,
      mySideAtTheBottom: Math.round(mySpot.y) > Math.round(mySpot.x),
    }).toEqual({
      slide: true,
      nearest: 0,
      intents: ["pull", "slide", "pull", "pull"],
      backwardsKept: true,
      diagonal: [0.6, -0.8, Math.round((10 / 22) * 100) / 100],
      fullAndMore: 1,
      tooShort: null,
      roundTrip: true,
      mySideAtTheBottom: true,
    });
  });
});
