import { afterEach, describe, expect, it, vi } from "vitest";
import { HAPTIC_LEVELS, pulseEnd, toVibrations, type HapticLevel } from "../src/web/haptics/definition";
import { HAPTICS, HAPTIC_NAMES, pulsesOf } from "../src/web/haptics/hapticBook";
import { HAPTIC_OF_SOUND, hapticStepsOf } from "../src/web/haptics/soundHaptics";
import { matchEndingSteps } from "../src/web/sound/cues/endingCues";
import { territoryEndingSteps } from "../src/web/games/territory/territoryCues";

/** Long enough for the biggest moment, short enough never to feel like a phone call. */
const LONGEST_FEEL_MS = 700;
/** What a motor needs to be felt at all; web-haptics' own `selection` preset turns on for just 2 ms. */
const SHORTEST_FELT_MS = 8;

const LEVELS = Object.keys(HAPTIC_LEVELS) as HapticLevel[];

/** What web-haptics really sends to the motor for this level: `[on, off, on, …]`. */
async function sentToMotor(level: HapticLevel): Promise<number[]> {
  const vibrate = vi.fn<(pattern: number[]) => boolean>(() => true);
  vi.stubGlobal("navigator", { vibrate });
  vi.resetModules();
  const { WebHaptics } = await import("web-haptics");
  await new WebHaptics().trigger(toVibrations([{ at: 0, level }]));
  return vibrate.mock.calls[0]![0];
}

const onTime = (pattern: readonly number[]) => pattern.filter((_, i) => i % 2 === 0).reduce((sum, ms) => sum + ms, 0);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("haptics book", () => {
  it.each(HAPTIC_NAMES)("%s starts at once, runs in order, no pulse overlapping, and isn't long", (name) => {
    const { pulses } = HAPTICS[name];
    expect(pulses[0]!.at).toBe(0);
    pulses.forEach((pulse, i) => {
      if (i > 0) expect(pulse.at).toBeGreaterThanOrEqual(pulseEnd(pulses[i - 1]!));
    });
    expect(pulseEnd(pulses[pulses.length - 1]!)).toBeLessThanOrEqual(LONGEST_FEEL_MS);
  });

  it("the champion is the biggest feel there is", () => {
    const lengths = HAPTIC_NAMES.map((name) => pulseEnd(HAPTICS[name].pulses.at(-1)!));
    expect(pulseEnd(HAPTICS.champion.pulses.at(-1)!)).toBe(Math.max(...lengths));
  });

  it("captures grow with the land", () => {
    expect(HAPTICS.territoryCaptureSmall.pulses.length).toBeLessThan(HAPTICS.territoryCaptureMedium.pulses.length);
    expect(HAPTICS.territoryCaptureMedium.pulses.length).toBeLessThan(HAPTICS.territoryCaptureLarge.pulses.length);
  });
});

describe("levels on the motor", () => {
  it.each(LEVELS)("%s runs long enough to be felt", async (level) => {
    expect(onTime(await sentToMotor(level))).toBeGreaterThanOrEqual(SHORTEST_FELT_MS);
  });

  it("each level pushes the motor for longer than the one below", async () => {
    const times = [];
    for (const level of LEVELS) times.push(onTime(await sentToMotor(level)));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(LEVELS.length);
  });
});

describe("feels follow sounds", () => {
  it("names only feels that exist", () => {
    for (const haptic of Object.values(HAPTIC_OF_SOUND)) expect(HAPTICS[haptic]).toBeDefined();
  });

  it("a winning match is felt at the sounds' own times, as one pattern", () => {
    const steps = matchEndingSteps("win", { lastMove: { sound: "ticTacToeMarkX" }, line: true });
    const felt = hapticStepsOf(steps);
    expect(felt.map((step) => step.haptic)).toEqual(["thump", "winLine", "matchWon"]);
    expect(felt.map((step) => step.at)).toEqual(steps.filter((step) => step.sound !== "ticTacToeMarkX").map((step) => step.at));
  });

  it("a watcher feels the thump but no result", () => {
    const felt = hapticStepsOf(matchEndingSteps("watch", { lastMove: null, line: true }));
    expect(felt.map((step) => step.haptic)).toEqual(["thump"]);
  });

  it("Territory's ending lands on its own beats", () => {
    expect(hapticStepsOf(territoryEndingSteps("lose")).map((step) => step.haptic)).toEqual(["thump", "territoryWinnerHeadDrop", "matchLost"]);
  });
});

describe("a whole moment as one pattern", () => {
  it("keeps time order and drops a pulse that would start before the last has finished", () => {
    const pulses = pulsesOf([
      { haptic: "smallNews", at: 500 },
      { haptic: "thump", at: 0 },
      { haptic: "smallPress", at: 10 },
    ]);
    expect(pulses).toEqual([
      { at: 0, level: "heavy" },
      { at: 500, level: "light" },
    ]);
  });

  it("waits the right time before each pulse", () => {
    expect(toVibrations([{ at: 300, level: "selection" }, { at: 400, level: "heavy" }])).toEqual([
      { ...HAPTIC_LEVELS.selection, delay: 300 },
      { ...HAPTIC_LEVELS.heavy, delay: 90 },
    ]);
  });
});
