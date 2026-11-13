import { describe, expect, it } from "vitest";
import { TOURNAMENT_CONFIG } from "../src/shared/tournament/config";
import { ROOM_CONFIG } from "../src/shared/rooms/config";
import { captureSound, distanceVolume, onRivalLand, outSound, territoryEndingSteps, trailCourse, trailShape } from "../src/web/games/territory/territoryCues";
import { lastMarkSound } from "../src/web/games/tictactoe/sounds";
import type { RoomView, PlayerView } from "../src/shared/protocol/messages";
import { renderSound, SOUND_LEVELS, SOUND_SAMPLE_RATE } from "../src/web/sound/definition";
import { highpass, lowpass } from "../src/web/sound/dsp/filters";
import { gainToDb } from "../src/web/sound/dsp/signal";
import { loudestWindowDb, mono, phoneLoudnessDb } from "../src/web/sound/dsp/master";
import { countdownTake, timerTake, timerVolume } from "../src/web/sound/cues/clockCues";
import { championSteps, matchEndingSteps, POINTS_WAIT_MS, pointsTickTake } from "../src/web/sound/cues/endingCues";
import { durations } from "../src/theme";
import { roomChangeCues } from "../src/web/sound/cues/roomCues";
import { POINT_TICK_TAKES } from "../src/web/sound/library/endingSounds";
import { COUNTDOWN_NOTES, TIMER_TAKES } from "../src/web/sound/library/playingSounds";
import { hz, PLAYER_NOTES, scaleStep } from "../src/web/sound/pitch";
import { SOUND_NAMES, soundDefinition, SOUNDS, type SoundName } from "../src/web/sound/soundBook";
import { DEFAULT_VOLUME, parseVolume, VOLUME_STEP, volumeGain } from "../src/web/sound/volume";
import { seededRandom } from "../src/shared/games/headcrash/random";
import { CELEBRATION_TIMING } from "../src/web/utils/celebrationTiming";
import { TERRITORY_CLIENT_CONFIG } from "../src/web/games/territory/config";
import { HEADCRASH_CLIENT_CONFIG } from "../src/web/games/headcrash/config";
import { bumpVolume, headCrashEndingSteps, hitSound, idleMotor, impactTake, landingTake, liftHum, motorSound, motorTargetRpm, stepMotor, type MotorInput, type MotorState } from "../src/web/games/headcrash/headCrashCues";
import { HEADCRASH_CONFIG } from "../src/shared/games/headcrash/config";


/** The first and, if it differs, the last take: the extremes of a sound with many. */
const takesToCheck = (name: SoundName) => {
  const takes = soundDefinition(name).variants ?? 1;
  return takes > 1 ? [0, takes - 1] : [0];
};

const rms = (track: Float32Array) => Math.sqrt(track.reduce((sum, x) => sum + x * x, 0) / track.length);

/** A test that renders every sound in one go takes longer as sounds are added (and while other tests share the CPU). */
const EVERY_SOUND_TIMEOUT_MS = 30_000;

describe("every sound", () => {
  for (const name of SOUND_NAMES) {
    const definition = soundDefinition(name);
    describe(name, () => {
      for (const take of takesToCheck(name)) {
        const [left, right] = renderSound(name, definition, take);
        const seconds = left.length / SOUND_SAMPLE_RATE;

        it(`take ${take} is clean: numbers only, never over the limit, no DC`, () => {
          let peak = 0;
          let sum = 0;
          for (let i = 0; i < left.length; i++) {
            expect(Number.isFinite(left[i]) && Number.isFinite(right[i])).toBe(true);
            peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
            sum += left[i]!;
          }
          expect(peak).toBeLessThanOrEqual(0.9);
          expect(Math.abs(sum / left.length)).toBeLessThan(0.002);
        });

        it(`take ${take} sits at its level on a phone`, () => {
          expect(phoneLoudnessDb(left, right, SOUND_SAMPLE_RATE)).toBeGreaterThan(SOUND_LEVELS[definition.level] - 2.5);
          expect(phoneLoudnessDb(left, right, SOUND_SAMPLE_RATE)).toBeLessThan(SOUND_LEVELS[definition.level] + 2.5);
        });

        it(`take ${take} isn't mostly bass a phone can't play, and isn't far louder on headphones than on a phone`, () => {
          const m = mono(left, right);
          const low = lowpass(m, SOUND_SAMPLE_RATE, 300);
          expect(gainToDb(rms(low)) - gainToDb(rms(m))).toBeLessThan(-0.5);
          expect(phoneLoudnessDb(left, right, SOUND_SAMPLE_RATE) - gainToDb(rms(m))).toBeGreaterThan(-20);
        });

        it(`take ${take} is never piercing`, () => {
          const m = mono(left, right);
          expect(gainToDb(rms(highpass(m, SOUND_SAMPLE_RATE, 9_000))) - gainToDb(rms(m))).toBeLessThan(-11);
        });

        if (definition.loopSeconds === undefined) {
          it(`take ${take} starts at once and ends in silence`, () => {
            const peak = left.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
            const first = left.findIndex((x) => Math.abs(x) > peak * 0.02);
            // Only sounds timed to a landing later on may start late.
            expect(first / SOUND_SAMPLE_RATE).toBeLessThan(0.2);
            expect(Math.abs(left.at(-1)!)).toBeLessThan(0.002);
            expect(Math.abs(right.at(-1)!)).toBeLessThan(0.002);
          });
        } else {
          it(`take ${take} loops without a click`, () => {
            const jump = Math.abs(left[0]! - left.at(-1)!);
            let largest = 0;
            for (let i = 1; i < left.length; i++) largest = Math.max(largest, Math.abs(left[i]! - left[i - 1]!));
            expect(jump).toBeLessThanOrEqual(largest * 1.5);
            expect(seconds).toBeCloseTo(definition.loopSeconds!, 2);
          });
        }
      }
    });
  }

  it("the hierarchy holds: quick sounds are short, only celebrations are huge", () => {
    for (const name of SOUND_NAMES) {
      const definition = soundDefinition(name);
      const [left] = renderSound(name, definition, 0);
      const seconds = left.length / SOUND_SAMPLE_RATE;
      if (definition.loopSeconds !== undefined) continue;
      if (definition.level === "tap") expect(seconds, name).toBeLessThan(1.1);
    }
  }, EVERY_SOUND_TIMEOUT_MS);

  it("nothing is clearly louder than winning, even on headphones, where a short low hit can edge past the trumpets", () => {
    const fullRange = (name: SoundName) => {
      const [left, right] = renderSound(name, soundDefinition(name), 0);
      return loudestWindowDb(mono(left, right), SOUND_SAMPLE_RATE);
    };
    const HEADPHONE_ALLOWANCE_DB = 3;
    const win = fullRange("matchWinFanfare");
    for (const name of SOUND_NAMES) {
      if (soundDefinition(name).level !== "celebration") expect(fullRange(name), name).toBeLessThan(win + HEADPHONE_ALLOWANCE_DB);
    }
  }, EVERY_SOUND_TIMEOUT_MS);

  it("renders the same every time", () => {
    const [first] = renderSound("matchLossSting", soundDefinition("matchLossSting"), 0);
    const [again] = renderSound("matchLossSting", soundDefinition("matchLossSting"), 0);
    expect(again).toEqual(first);
  });

  it("takes of a sound really differ", () => {
    for (const name of ["playerJoined", "ticTacToeMarkX", "timerTick", "territoryCaptureSmall"] as const) {
      const [a] = renderSound(name, soundDefinition(name), 0);
      const [b] = renderSound(name, soundDefinition(name), soundDefinition(name).variants! - 1);
      expect(a.length === b.length && a.every((x, i) => x === b[i]), name).toBe(false);
    }
  });

  it("describes itself in plain words, and game sounds carry their game's name", () => {
    for (const name of SOUND_NAMES) expect(soundDefinition(name).about.length, name).toBeGreaterThan(20);
    expect(Object.keys(SOUNDS).filter((name) => /^(territory|ticTacToe)/.test(name)).length).toBeGreaterThan(10);
  });
});

describe("pitch", () => {
  it("knows its notes", () => {
    expect(hz("A4")).toBeCloseTo(440, 5);
    expect(hz("D5")).toBeCloseTo(587.33, 1);
    expect(scaleStep(0)).toBe("D4");
    expect(scaleStep(5)).toBe("D5");
    expect(scaleStep(8)).toBe("A5");
  });

  it("every player of a full room has a note", () => {
    expect(PLAYER_NOTES.length).toBeGreaterThanOrEqual(ROOM_CONFIG.maxPlayers);
  });
});

const player = (id: number, over: Partial<PlayerView> = {}): PlayerView => ({ id, name: `P${id}`, connected: true, trophies: 0, suggestion: null, ...over });
const room = (over: Partial<RoomView> = {}): RoomView => ({ code: "100000", phase: "lobby", hostId: 0, players: [player(0), player(1)], tournament: null, arena: null, party: null, serverNow: 0, ...over });
const sounds = (before: RoomView | null, after: RoomView, me = 0) => roomChangeCues(before, after, me).map((c) => c.sound);

describe("room sounds", () => {
  it("you arriving, only you", () => {
    expect(sounds(null, room())).toEqual(["roomEntered"]);
  });

  it("friends join on their own note, and leave", () => {
    const after = room({ players: [player(0), player(1), player(2)] });
    expect(roomChangeCues(room(), after, 0)).toEqual([{ sound: "playerJoined", variant: 2 }]);
    expect(roomChangeCues(after, room(), 0)).toEqual([{ sound: "playerLeft", variant: 2 }]);
    expect(sounds(room(), room({ players: [player(0)] }), 1)).toEqual([]);
  });

  it("your own echo is silent; a friend's suggestion isn't", () => {
    expect(sounds(room(), room({ players: [player(0, { suggestion: "tictactoe" }), player(1)] }))).toEqual([]);
    expect(roomChangeCues(room(), room({ players: [player(0), player(1, { suggestion: "tictactoe" })] }), 0)).toEqual([{ sound: "friendSuggestedGame", variant: 1 }]);
    expect(sounds(room({ players: [player(0), player(1, { suggestion: "tictactoe" })] }), room())).toEqual([]);
  });

  it("away and back", () => {
    const away = room({ players: [player(0), player(1, { connected: false })] });
    expect(sounds(room(), away)).toEqual(["playerWentAway"]);
    expect(sounds(away, room())).toEqual(["playerCameBack"]);
  });

  it("the crown passing to you", () => {
    expect(sounds(room({ hostId: 1 }), room({ hostId: 0 }))).toEqual(["youBecameHost"]);
    expect(sounds(room({ hostId: 0 }), room({ hostId: 1 }))).toEqual([]);
  });

  it("a game starting, once; comings and goings wait until it's over", () => {
    const arena = { startedAt: 5 } as RoomView["arena"];
    const playing = room({ phase: "playing", arena });
    expect(sounds(room(), playing)).toEqual(["gameStarting"]);
    expect(sounds(playing, room({ phase: "playing", arena }))).toEqual([]);
    expect(sounds(playing, room({ phase: "playing", arena, players: [player(0), player(1), player(2)] }))).toEqual([]);
    expect(sounds(room({ phase: "finished", arena }), room({ phase: "playing", arena: { startedAt: 9 } as RoomView["arena"] }))).toEqual(["gameStarting"]);
  });
});

describe("clocks", () => {
  it("3, 2, 1 climb through every take", () => {
    expect([3, 2, 1].map(countdownTake)).toEqual([0, 1, 2]);
    expect(COUNTDOWN_NOTES.length).toBe(3);
  });

  it("the last 5 seconds get firmer and louder; before that they stay on the first", () => {
    expect([10, 6, 5, 4, 3, 2, 1].map(timerTake)).toEqual([0, 0, 0, 1, 2, 3, 4]);
    expect(TIMER_TAKES).toBe(5);
    expect(timerVolume(1)).toBe(1);
    expect(timerVolume(5)).toBeLessThan(timerVolume(1));
    expect(timerVolume(10)).toBeLessThan(timerVolume(5));
    expect(timerVolume(30)).toBe(0.5);
  });

  it("points climb a step per point; long counts use the whole climb", () => {
    expect([1, 2].map((v) => pointsTickTake(v, 2))).toEqual([0, 1]);
    expect(pointsTickTake(1, 85)).toBe(0);
    expect(pointsTickTake(85, 85)).toBe(POINT_TICK_TAKES - 1);
    expect(pointsTickTake(TOURNAMENT_CONFIG.winPoints, TOURNAMENT_CONFIG.winPoints)).toBeLessThan(POINT_TICK_TAKES);
  });
});

describe("endings are timed to their animations", () => {
  const mark = { sound: "ticTacToeMarkX", variant: 4 } as const;
  const at = (steps: readonly { sound: string; at: number }[], sound: string) => steps.find((s) => s.sound === sound)?.at;

  it("a win: mark, thump, then silence (the freeze), line, fanfare", () => {
    const steps = matchEndingSteps("win", { lastMove: mark, line: true });
    expect(steps.map((s) => s.sound)).toEqual(["ticTacToeMarkX", "boardThump", "winLineDrawnWithSparks", "matchWinFanfare"]);
    expect(at(steps, "ticTacToeMarkX")).toBe(0);
    expect(at(steps, "winLineDrawnWithSparks")).toBe(CELEBRATION_TIMING.lineAt);
    expect(at(steps, "matchWinFanfare")).toBe(CELEBRATION_TIMING.celebrateAt);
    expect(at(steps, "boardThump")!).toBeLessThan(CELEBRATION_TIMING.lineAt);
  });

  it("a loss has no party", () => {
    const steps = matchEndingSteps("lose", { lastMove: mark, line: true });
    expect(steps.map((s) => s.sound)).toEqual(["ticTacToeMarkX", "boardThump", "winLineDrawn", "matchLossSting"]);
  });

  it("someone quitting: no last move, no line", () => {
    const steps = matchEndingSteps("win", { lastMove: null, line: false });
    expect(steps.map((s) => s.sound)).toEqual(["boardThump", "matchWinFanfare"]);
  });

  it("a draw shrugs, then rattles with the shake", () => {
    const steps = matchEndingSteps("draw", { lastMove: mark, line: false });
    expect(at(steps, "boardShakeRattle")).toBe(CELEBRATION_TIMING.celebrateAt);
    expect(steps.some((s) => s.sound === "matchWinFanfare")).toBe(false);
  });

  it("watching gets a polite result", () => {
    expect(matchEndingSteps("watch", { lastMove: mark, line: true }).map((s) => s.sound)).toContain("matchWatchedResult");
  });

  it("champions: yours, shared, or someone else's", () => {
    expect(championSteps([1], 1)[0]!.sound).toBe("championFanfare");
    expect(championSteps([1, 2], 2)[0]!.sound).toBe("championFanfareShared");
    expect(championSteps([1], 0)[0]!.sound).toBe("championAnnounced");
  });

  it("the points wait for the win tune's last note to ring out", () => {
    const steps = matchEndingSteps("win", { lastMove: null, line: false });
    // A finished match stays on screen for 4 s (`resultShowMs`), and the count has to finish well inside it.
    expect(at(steps, "matchWinFanfare")! + POINTS_WAIT_MS.win + durations.countUp).toBeLessThan(3_000);
    expect(POINTS_WAIT_MS.win).toBeGreaterThan(600);
  });

  it("the trail knows when it's on someone else's land", () => {
    const land = [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]];
    const players = [{ isMe: false, land: [land] }, { isMe: true, land: [[[{ x: 500, y: 500 }, { x: 600, y: 500 }, { x: 600, y: 600 }, { x: 500, y: 600 }]]] }];
    expect(onRivalLand({ x: 50, y: 50 }, players)).toBe(true);
    expect(onRivalLand({ x: 550, y: 550 }, players)).toBe(false);
    expect(onRivalLand({ x: 300, y: 300 }, players)).toBe(false);
  });

  it("on someone's land the same trail goes darker and heavier", () => {
    const open = trailShape(false, 0);
    const rival = trailShape(true, 0);
    expect(rival.volume).toBeGreaterThan(open.volume);
    expect(rival.cutoffHz).toBeLessThan(open.cutoffHz);
  });

  it("the trail's course: the same build-up the trail always had, handed over once", () => {
    const { trailBuildMs, trailMoveMs } = TERRITORY_CLIENT_CONFIG.sound;
    const fresh = trailCourse(false, 0);
    const full = trailShape(false, 1);
    expect(fresh.at(-1)).toMatchObject({ volume: full.volume, rate: full.rate });
    expect(fresh.at(-1)!.inSeconds).toBeCloseTo((trailMoveMs + trailBuildMs) / 1000);
    // Halfway out, onto rival land: there quickly, then on to the rival's fully built sound in the time left.
    const halfway = trailCourse(true, 0.5);
    const rivalNow = trailShape(true, 0.5 + trailMoveMs / trailBuildMs);
    expect(halfway[0]).toMatchObject({ inSeconds: trailMoveMs / 1000, volume: rivalNow.volume, rate: rivalNow.rate });
    expect(halfway.at(-1)!.inSeconds).toBeCloseTo((trailMoveMs + trailBuildMs / 2) / 1000);
    // Long out, it only moves to the built sound.
    expect(trailCourse(false, 3)).toHaveLength(1);
  });

  it("Territory's ending follows the arena's", () => {
    const steps = territoryEndingSteps("win");
    expect(at(steps, "territoryWinnerHeadDrop")).toBe(TERRITORY_CLIENT_CONFIG.look.winnerHeadAtMs);
    expect(at(steps, "matchWinFanfare")).toBe(TERRITORY_CLIENT_CONFIG.hud.endTagAtMs);
    expect(territoryEndingSteps("lose").map((s) => s.sound)).toContain("matchLossSting");
    expect(territoryEndingSteps("watch").map((s) => s.sound)).toContain("matchWatchedResult");
  });
});

describe("game sounds", () => {
  it("a mark's sound and its place in the climb", () => {
    const game = { board: [0, 1, null, null, null, null, null, null, null], turn: 0, winner: null, winningLine: null, isDraw: false, lastMove: 1 } as Parameters<typeof lastMarkSound>[0];
    expect(lastMarkSound(game)).toEqual({ sound: "ticTacToeMarkO", variant: 1 });
    expect(lastMarkSound({ ...game, lastMove: 0, board: [0, null, null, null, null, null, null, null, null] })).toEqual({ sound: "ticTacToeMarkX", variant: 0 });
    expect(lastMarkSound({ ...game, lastMove: null })).toBeNull();
  });

  it("captures go by size", () => {
    const { mediumArea, largeArea } = TERRITORY_CLIENT_CONFIG.captureSize;
    expect(captureSound(mediumArea - 1)).toBe("territoryCaptureSmall");
    expect(captureSound(mediumArea)).toBe("territoryCaptureMedium");
    expect(captureSound(largeArea)).toBe("territoryCaptureLarge");
  });

  it("others are heard as far away as they are", () => {
    const { hearFullAt, hearNoneAt } = TERRITORY_CLIENT_CONFIG.sound;
    expect(distanceVolume(0)).toBe(1);
    expect(distanceVolume(hearFullAt)).toBe(1);
    expect(distanceVolume((hearFullAt + hearNoneAt) / 2)).toBeCloseTo(0.5);
    expect(distanceVolume(hearNoneAt * 2)).toBe(0);
  });

  it("who goes out, and whose doing it was", () => {
    const out = (id: number, by: number | null, reason: "cut" | "land" | "quit") => ({ kind: "out", id, by, reason, x: 0, y: 0, at: 0 }) as const;
    expect(outSound(out(0, 1, "cut"), 0)).toBe("territoryYouAreOut");
    expect(outSound(out(0, 1, "land"), 0)).toBe("territoryYouAreOut");
    expect(outSound(out(0, null, "quit"), 0)).toBeNull();
    expect(outSound(out(1, 0, "cut"), 0)).toBe("territoryYouKnockedSomeoneOut");
    expect(outSound(out(1, 0, "land"), 0)).toBe("territoryYouKnockedSomeoneOut");
    expect(outSound(out(1, 2, "cut"), 0)).toBe("territoryPlayerBurst");
    expect(outSound(out(1, null, "quit"), 0)).toBe("territoryPlayerQuit");
  });
});

describe("the volume", () => {
  it("100 leaves every sound as made, 0 is silent, and each step is quieter", () => {
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(50)).toBeCloseTo(0.25);
    for (let volume = VOLUME_STEP; volume <= 100; volume += VOLUME_STEP) {
      expect(volumeGain(volume)).toBeGreaterThan(volumeGain(volume - VOLUME_STEP));
    }
  });

  it("starts at 100; what's saved is kept, in range; anything unreadable is the default", () => {
    expect(DEFAULT_VOLUME).toBe(100);
    expect(parseVolume(null)).toBe(100);
    expect(parseVolume("")).toBe(100);
    expect(parseVolume("loud")).toBe(100);
    expect(parseVolume("Infinity")).toBe(100);
    expect(parseVolume("0")).toBe(0);
    expect(parseVolume("40")).toBe(40);
    expect(parseVolume("140")).toBe(100);
    expect(parseVolume("-5")).toBe(0);
  });
});

describe("Head Crash cues", () => {
  const { minImpact, hardImpact, minAirTicks } = HEADCRASH_CLIENT_CONFIG.sound;

  it("a hit sounds like what it means to you", () => {
    expect(hitSound(0, 0)).toBe("headCrashYouScored");
    expect(hitSound(1, 0)).toBe("headCrashYouWereHit");
    expect(hitSound(null, 1)).toBe("headCrashBothHeadsHit");
    expect(hitSound(0, null)).toBe("headCrashWatchedHit");
    expect(hitSound(null, null)).toBe("headCrashWatchedHit");
  });

  it("only real landings and knocks are heard, harder ones louder", () => {
    expect(landingTake(minImpact - 0.1, minAirTicks)).toBeNull();
    expect(landingTake(hardImpact, minAirTicks - 1)).toBeNull();
    expect(landingTake(minImpact, minAirTicks)).toEqual({ variant: 0, volume: 0.55 });
    expect(landingTake(hardImpact * 2, minAirTicks)).toEqual({ variant: 1, volume: 1 });
    expect(bumpVolume(minImpact - 0.1)).toBe(0);
    expect(bumpVolume(minImpact)).toBe(0.5);
    expect(bumpVolume(hardImpact)).toBe(1);
  });

  it("your car's body knocking the rock sounds like a landing does: only real knocks, harder ones louder", () => {
    expect(impactTake(minImpact - 0.1)).toBeNull();
    expect(impactTake(minImpact)).toEqual({ variant: 0, volume: 0.55 });
    expect(impactTake(hardImpact * 2)).toEqual({ variant: 1, volume: 1 });
  });

  describe("your motor", () => {
    const { motor } = HEADCRASH_CLIENT_CONFIG.sound;
    const top = HEADCRASH_CONFIG.drive.maxSpeed;
    const FRAME = 1 / 60;
    /** Runs the motor frame by frame through `inputs`, one per frame. */
    const run = (inputs: readonly MotorInput[], from: MotorState = idleMotor()) => {
      const states = [from];
      for (const input of inputs) states.push(stepMotor(states.at(-1)!, input, FRAME));
      return states;
    };

    it("never jumps: from frame to frame its pitch, volume and tone move only a little, however the buttons and wheels change", () => {
      const random = seededRandom(9);
      const inputs = Array.from({ length: 1_200 }, (_, i) => ({ held: random() < 0.5, speed: random() * top, grounded: i % 3 !== 0 }));
      const sounds = run(inputs).map(motorSound);
      for (let i = 1; i < sounds.length; i++) {
        expect(Math.abs(sounds[i]!.rate - sounds[i - 1]!.rate)).toBeLessThanOrEqual(Math.max(motor.rpmRise, motor.rpmFall) * FRAME + 1e-9);
        expect(Math.abs(sounds[i]!.volume - sounds[i - 1]!.volume)).toBeLessThan(0.1);
        expect(Math.abs(Math.log(sounds[i]!.cutoffHz / sounds[i - 1]!.cutoffHz))).toBeLessThan(0.25);
      }
    });

    it("ticks over muffled with no button; setting off, the throttle opens at once and the revs climb as the car speeds up", () => {
      expect(motorSound(idleMotor())).toEqual({ volume: motor.idle.volume, rate: motor.idle.rate, cutoffHz: motor.closedHz });
      // A car accelerating to top speed over about half a second, then holding it.
      const speeds = Array.from({ length: 90 }, (_, i) => Math.min(top, (top * i) / 30));
      const states = run(speeds.map((speed) => ({ held: true, speed, grounded: true })));
      const sounds = states.map(motorSound);
      for (let i = 1; i < sounds.length; i++) expect(sounds[i]!.rate).toBeGreaterThanOrEqual(sounds[i - 1]!.rate - 1e-9);
      expect(sounds[10]!.cutoffHz).toBeGreaterThan(motor.openHz * 0.9);
      expect(sounds.at(-1)!.rate).toBeCloseTo(motor.topRate, 5);
      // Letting go at speed: the tone closes, and the revs come down with the car.
      const coast = run([{ held: false, speed: top, grounded: true }], states.at(-1)!).map(motorSound).at(-1)!;
      expect(coast.cutoffHz).toBeLessThan(sounds.at(-1)!.cutoffHz);
      expect(motorSound(run(Array(120).fill({ held: false, speed: 0, grounded: true }), states.at(-1)!).at(-1)!).rate).toBeCloseTo(motor.idle.rate, 5);
    });

    it("revs free in the air with a button held, falls back without; a wheel leaving the ground for a moment barely moves it", () => {
      expect(motorTargetRpm({ held: true, speed: 0, grounded: false })).toBe(motor.maxRate);
      expect(motorTargetRpm({ held: false, speed: top, grounded: false })).toBe(motor.idle.rate);
      expect(motorTargetRpm({ held: true, speed: 0, grounded: true })).toBeCloseTo(motor.idle.rate + motor.launch, 9);
      expect(motorTargetRpm({ held: true, speed: top * 2, grounded: true })).toBeCloseTo(motor.topRate, 9);
      const cruising = run(Array(120).fill({ held: true, speed: top / 2, grounded: true })).at(-1)!;
      const bounced = run([{ held: true, speed: top / 2, grounded: false }, { held: true, speed: top / 2, grounded: false }], cruising).at(-1)!;
      expect(Math.abs(bounced.rpm - cruising.rpm)).toBeLessThan(0.08);
    });
  });

  it("the lift's winch is heard only while it moves: swelling and fading with its speed, never jumping, higher going up", () => {
    const { tickRate, gadgets } = HEADCRASH_CONFIG;
    const { lift } = HEADCRASH_CLIENT_CONFIG.sound;
    const wait = gadgets.liftWait * tickRate;
    const move = gadgets.liftMove * tickRate;
    expect(liftHum(0).volume).toBe(0);
    expect(liftHum(wait / 2).volume).toBe(0);
    expect(liftHum(wait + move / 2)).toEqual({ volume: expect.closeTo(1, 6), rate: lift.upRate });
    expect(liftHum(2 * wait + move + move / 2)).toEqual({ volume: expect.closeTo(1, 6), rate: lift.downRate });
    for (let tick = 1; tick <= 2 * (wait + move); tick++) expect(Math.abs(liftHum(tick).volume - liftHum(tick - 1).volume)).toBeLessThan(0.05);
  });

  it("the result sounds as the tag stamps on", () => {
    for (const [tone, sound] of [["win", "matchWinFanfare"], ["lose", "matchLossSting"], ["draw", "matchDrawShrug"], ["watch", "matchWatchedResult"]] as const) {
      expect(headCrashEndingSteps(tone)).toEqual([{ sound, at: HEADCRASH_CLIENT_CONFIG.hud.endTagAtMs }]);
    }
  });
});
