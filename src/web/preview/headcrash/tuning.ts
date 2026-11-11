import { HEADCRASH_CONFIG } from "../../../shared/games/headcrash/config";

/**
 * Dev-only: the driving's numbers the preview's tuner can change while it plays. It writes straight into
 * `HEADCRASH_CONFIG` (the physics reads it on every step), only on this page: the server and real matches always
 * use the numbers in `config.ts`. What the owner settles on goes into `config.ts` by hand.
 */

type Group = "drive" | "suspension" | "air" | "car" | "contact" | "world";

export interface Knob {
  /** Where it lives in `HEADCRASH_CONFIG`: a group and a key, or just a key for `gravity`. */
  group: Group;
  key: string;
  label: string;
  /** What it does, in plain words. */
  help: string;
  min: number;
  max: number;
  /** Decimals shown. */
  decimals: number;
}

export const KNOBS: readonly Knob[] = [
  { group: "drive", key: "maxSpeed", label: "Top speed", help: "How fast a button drives the car", min: 4, max: 30, decimals: 1 },
  { group: "drive", key: "accel", label: "Acceleration", help: "How quickly it gets to top speed", min: 5, max: 120, decimals: 0 },
  { group: "drive", key: "grip", label: "Grip", help: "How hard the tyres can push before they slip", min: 0.3, max: 4, decimals: 2 },
  { group: "drive", key: "rollDecel", label: "Rolling slowdown", help: "How fast it slows with no button", min: 0, max: 20, decimals: 1 },
  { group: "drive", key: "lean", label: "Lean from the tyres", help: "How much setting off lifts the nose and braking dips it", min: 0, max: 1.5, decimals: 2 },
  { group: "drive", key: "tiltAccel", label: "Ground lift strength", help: "How hard a button lifts the car on the ground (wheelies; 0: off). Fades as it reaches top speed", min: 0, max: 40, decimals: 1 },
  { group: "drive", key: "tiltSpin", label: "Ground lift speed", help: "How fast that lift turns the car at most", min: 0, max: 8, decimals: 1 },
  { group: "drive", key: "tiltMax", label: "Ground lift limit", help: "Highest lift (0.45 is about 26°). Past 0.8 the car falls over backwards", min: 0.1, max: 0.8, decimals: 2 },
  { group: "suspension", key: "stiffness", label: "Spring stiffness", help: "Low: soft, sinks and bounces a lot. High: stiff", min: 15, max: 400, decimals: 0 },
  { group: "suspension", key: "damping", label: "Spring damping", help: "Low: bouncy, keeps rocking. High: settles at once", min: 0, max: 40, decimals: 1 },
  { group: "suspension", key: "travel", label: "Spring travel", help: "How far a wheel can push up before it hits the body", min: 0.02, max: 0.45, decimals: 2 },
  { group: "air", key: "maxSpin", label: "Air flip speed", help: "How fast a button flips the car in the air", min: 1, max: 14, decimals: 1 },
  { group: "air", key: "spinAccel", label: "Air flip pickup", help: "How quickly the flip gets to that speed", min: 2, max: 80, decimals: 0 },
  { group: "air", key: "damping", label: "Air spin slowdown", help: "How fast the car stops spinning with no button", min: 0, max: 6, decimals: 2 },
  { group: "car", key: "inertia", label: "Car turn weight", help: "Low: tips and flips easily. High: lazy, steady", min: 0.15, max: 3, decimals: 2 },
  { group: "world", key: "gravity", label: "Gravity", help: "Low: floaty, big jumps. High: heavy", min: 5, max: 60, decimals: 1 },
  { group: "contact", key: "bounce", label: "Ground bounce", help: "How much the body bounces off the ground and walls", min: 0, max: 0.9, decimals: 2 },
  { group: "contact", key: "carBounce", label: "Car bounce", help: "How much the cars bounce off each other", min: 0, max: 1.2, decimals: 2 },
  { group: "contact", key: "bodyFriction", label: "Body friction", help: "How much the body drags when it scrapes the ground", min: 0, max: 1.5, decimals: 2 },
  { group: "contact", key: "carFriction", label: "Car friction", help: "How much the cars drag on each other", min: 0, max: 1.5, decimals: 2 },
];

/** The config as plain numbers to write into (it is typed read-only for the game's own code). */
const LIVE = HEADCRASH_CONFIG as unknown as Record<string, number | Record<string, number>>;

function home(knob: Knob): Record<string, number> {
  return knob.group === "world" ? (LIVE as Record<string, number>) : (LIVE[knob.group] as Record<string, number>);
}

export const knobId = (knob: Knob) => `${knob.group}.${knob.key}`;

/** The numbers in `config.ts`, before any tuning. */
export const DEFAULTS: Readonly<Record<string, number>> = Object.fromEntries(KNOBS.map((k) => [knobId(k), home(k)[k.key]!]));

export const readKnob = (knob: Knob): number => home(knob)[knob.key]!;

export function writeKnob(knob: Knob, value: number) {
  home(knob)[knob.key] = value;
}

const STORAGE_KEY = "headcrash-tuning";

/** What is kept: the values, and the `config.ts` numbers they were tuned from. */
interface Saved {
  from: Record<string, number>;
  values: Record<string, unknown>;
}

const sameDefaults = (from: unknown) =>
  typeof from === "object" && from !== null && KNOBS.every((k) => (from as Record<string, unknown>)[knobId(k)] === DEFAULTS[knobId(k)]);

/**
 * Puts back what was tuned last time on this browser, unless `config.ts` has changed since (new numbers were
 * picked): then the tuner starts from them.
 */
export function loadTuning() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
    if (!sameDefaults(saved.from) || typeof saved.values !== "object" || saved.values === null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    for (const knob of KNOBS) {
      const value = saved.values[knobId(knob)];
      if (typeof value === "number" && Number.isFinite(value)) writeKnob(knob, Math.min(knob.max, Math.max(knob.min, value)));
    }
  } catch {
    // No storage (private window): start from the defaults.
  }
}

export function saveTuning() {
  try {
    const saved: Saved = { from: { ...DEFAULTS }, values: Object.fromEntries(KNOBS.map((k) => [knobId(k), readKnob(k)])) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // No storage: the values just last until the page reloads.
  }
}

export function resetTuning() {
  for (const knob of KNOBS) writeKnob(knob, DEFAULTS[knobId(knob)]!);
  saveTuning();
}

export const formatKnob = (knob: Knob, value: number) => value.toFixed(knob.decimals);

/** The values changed from `config.ts`, one per line (`drive.lean 0.65 → 0.9`), to paste back to Claude. */
export function changedText(): string {
  const lines = KNOBS.filter((k) => readKnob(k) !== DEFAULTS[knobId(k)]).map(
    (k) => `${knobId(k)} ${formatKnob(k, DEFAULTS[knobId(k)]!)} → ${formatKnob(k, readKnob(k))}`,
  );
  return lines.length > 0 ? lines.join("\n") : "Nothing changed yet";
}
