import { bandpass, lowpass } from "../../sound/dsp/filters";
import { ring } from "../../sound/dsp/modes";
import { addInto, envelope, noise, saturate, strike } from "../../sound/dsp/signal";
import { defineSounds, LOOP_CROSSFADE } from "../../sound/definition";
import { mallet, pop, scatter, stamp, swish, thump, woodTap } from "../../sound/kit";
import type { Mix } from "../../sound/mix";

const MOTOR_SECONDS = 1;
/**
 * The motor's firings a second as made (the player plays it from about 0.7 to twice as fast), so a whole number fits
 * the loop. Even, all the same strength (owner, 2026-11-12: an uneven V8 lope made a held button sound like the
 * throttle being pressed and let go, again and again): a held button is one steady roar.
 */
const MOTOR_FIRINGS = 48;
/** A filter run on a loop as if it had always been going: twice round, keeping the second time round. */
function roundTheLoop(track: Float32Array, filter: (x: Float32Array) => Float32Array): Float32Array {
  const twice = new Float32Array(track.length * 2);
  twice.set(track);
  twice.set(track, track.length);
  return filter(twice).slice(track.length);
}

/**
 * A big race car's motor, without end: deep, hard firings (a low punch, the block and the pipes ringing above it, a
 * rough breath of exhaust), driven into a growl, coming evenly so it roars steadily. They differ only a hair, so it
 * sounds alive, not stamped out.
 *
 * Made exactly round: a firing near the end rings on over the seam into the start, so one loop is the sound itself,
 * with no join. Loops are closed by blending their start with what follows them, evenly in power, which suits noise;
 * here what follows is the start itself, and that blend would swell it about 3 dB once a loop (a held throttle that
 * seemed to ease on and off), so both are scaled to add back up to exactly the sound.
 */
function raceMotor(mix: Mix): Float32Array {
  const length = Math.round(MOTOR_SECONDS * mix.sampleRate);
  const fade = Math.round(LOOP_CROSSFADE * mix.sampleRate);
  const cycle = new Float32Array(length);
  const grit = Array.from({ length: MOTOR_FIRINGS }, () => mix.between(0.98, 1));
  for (let k = 0; k < MOTOR_FIRINGS; k++) {
    const firing = ring(mix, [
      { hz: 112, amp: 1, decay: 0.022, attack: 0.0006, from: 1.6, glide: 0.004 },
      { hz: 196, amp: 0.75, decay: 0.014, attack: 0.0005 },
      { hz: 370, amp: 0.5, decay: 0.008, attack: 0.0004 },
      { hz: 610, amp: 0.28, decay: 0.005, attack: 0.0004 },
    ]);
    addInto(firing, envelope(mix, bandpass(noise(mix, 0.03), mix.sampleRate, 420, 0.7), strike(0.0006, 0.007)), 0, 0.45);
    const at = Math.round((k * length) / MOTOR_FIRINGS);
    for (let i = 0; i < firing.length; i++) cycle[(at + i) % length]! += firing[i]! * grit[k]!;
  }
  const growl = roundTheLoop(saturate(cycle, 3.2), (x) => lowpass(x, mix.sampleRate, 2_600));
  const out = new Float32Array(length + fade);
  out.set(growl);
  out.set(growl.subarray(0, fade), length);
  for (let i = 0; i < fade; i++) {
    const share = i / fade;
    const evenOut = 1 / (Math.sqrt(share) + Math.sqrt(1 - share));
    out[i]! *= evenOut;
    out[length + i]! *= evenOut;
  }
  return out;
}

/** A round drum skin's modes (a stretched mat rings like one): not whole multiples, which is what makes it a skin and not a string. */
const MEMBRANE = [
  { ratio: 1, amp: 1, decay: 1 },
  { ratio: 1.59, amp: 0.55, decay: 0.7 },
  { ratio: 2.14, amp: 0.35, decay: 0.5 },
  { ratio: 2.65, amp: 0.2, decay: 0.35 },
] as const;

/**
 * A car landing on a trampoline mat: the stretched mat's deep "thoom" (its pitch sagging as the mat stretches, then
 * springing back), its frame taking the weight, the coil springs around it ringing for a moment with a shiver, and the
 * air pushed out from under it.
 */
function trampolineMat(mix: Mix): Float32Array {
  const mat = ring(
    mix,
    MEMBRANE.map((m) => ({ hz: 165 * m.ratio, amp: m.amp, decay: 0.1 * m.decay, attack: 0.002, from: 0.82, glide: 0.035 })),
  );
  // The pad's frame taking the weight: a short knock in the middle, which is what a phone speaker plays of the thoom.
  const frame = ring(mix, [
    { hz: 430, amp: 1, decay: 0.03, attack: 0.001 },
    { hz: 690, amp: 0.6, decay: 0.02, attack: 0.001 },
    { hz: 1_010, amp: 0.3, decay: 0.012, attack: 0.001 },
  ]);
  // The springs: thin coiled steel, metallic (far from whole multiples), quick to die, trembling as they shake.
  const springs = ring(mix, [
    { hz: 1_480, amp: 0.5, decay: 0.07, attack: 0.001 },
    { hz: 2_210, amp: 0.35, decay: 0.05, attack: 0.001 },
    { hz: 3_370, amp: 0.2, decay: 0.035, attack: 0.001 },
  ]);
  const shiver = envelope(mix, springs, (t) => 0.6 + 0.4 * Math.cos(2 * Math.PI * 34 * t));
  const air = envelope(mix, bandpass(noise(mix, 0.2), mix.sampleRate, 380, 0.8), strike(0.008, 0.045));
  const out = saturate(mat, 1.3);
  addInto(out, frame, 0, 0.45);
  addInto(out, shiver, Math.round(0.004 * mix.sampleRate), 0.3);
  addInto(out, air, 0, 0.6);
  return out;
}

const LIFT_SECONDS = 1;
/** Gear teeth passing a second in the lift's winch as made, so a whole number fits the loop. */
const LIFT_TEETH = 40;

/**
 * The lift's winch, without end: a low electric hum (narrow bands of noise, so it wavers like a real motor) and its
 * gear teeth ticking past, small and even. Each tooth repeats exactly a loop later.
 */
function liftWinch(mix: Mix, seconds: number): Float32Array {
  const raw = noise(mix, seconds);
  const out = new Float32Array(raw.length);
  addInto(out, bandpass(raw, mix.sampleRate, 196, 14), 0, 1);
  addInto(out, bandpass(raw, mix.sampleRate, 392, 12), 0, 0.6);
  addInto(out, bandpass(raw, mix.sampleRate, 588, 10), 0, 0.3);
  const teeth = Array.from({ length: LIFT_TEETH }, () => mix.between(0.7, 1));
  for (let k = 0; k * (LIFT_SECONDS / LIFT_TEETH) < seconds; k++) {
    const tooth = ring(mix, [
      { hz: 1_250, amp: 1, decay: 0.003, attack: 0.0004 },
      { hz: 2_050, amp: 0.4, decay: 0.002, attack: 0.0003 },
    ]);
    addInto(out, tooth, Math.round((k * LIFT_SECONDS * mix.sampleRate) / LIFT_TEETH), 0.05 * teeth[k % LIFT_TEETH]!);
  }
  return lowpass(out, mix.sampleRate, 3_000);
}

/**
 * Head Crash is rubber and weight: wheels landing, two toy cars knocking, and one big moment per round, the hit.
 * Your point is a fat pop and two notes up; your own head being hit is a low blow and two notes down. Your own car's
 * race motor growls under everything and revs with your buttons; the map's gadgets each have their own sound. A match
 * you only watch is heard from further away.
 */
export const HEADCRASH_SOUNDS = defineSounds({
  headCrashMotorLoop: {
    about: "Loop: your own car's motor, a big race car's: a deep, growling, steady burble while the match runs, revving into a heavy, steady roar the moment you hold a button (even in the air) and climbing with your speed.",
    level: "quiet",
    room: 0,
    loopSeconds: MOTOR_SECONDS,
    deepLoop: true,
    render(mix) {
      mix.add(raceMotor(mix));
    },
  },
  headCrashLanding: {
    about: "Your car comes down on its wheels after a jump: rubber on a thick floor. The second take is a hard landing.",
    level: "tap",
    room: 0.1,
    variants: 2,
    cooldownMs: 140,
    render(mix, take) {
      const hard = take === 1;
      mix.add(thump(mix, { hz: hard ? 112 : 138, drop: 1.4, decay: hard ? 0.06 : 0.035, drive: hard ? 1.6 : 1.2, box: 320 }));
      mix.add(woodTap(mix, { hz: hard ? 420 : 520, decay: 0.016, hardness: 0.25 }), { gain: hard ? 0.45 : 0.3 });
    },
  },
  headCrashKnock: {
    about: "Your car's body (not its wheels) hits the rock: a wall, the roof, a lift's side. A dry knock on the car's shell; the second take is a hard one.",
    level: "tap",
    room: 0.1,
    variants: 2,
    cooldownMs: 160,
    render(mix, take) {
      const hard = take === 1;
      mix.add(thump(mix, { hz: hard ? 118 : 134, drop: 1.3, decay: hard ? 0.045 : 0.03, drive: 1.4, box: 380 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: hard ? 520 : 600, decay: 0.018, hardness: 0.6 }), { gain: hard ? 0.65 : 0.5 });
    },
  },
  headCrashPadThrow: {
    about: "A bounce pad throws your car high: it lands on a stretched trampoline mat (a deep thoom), the springs round it ring and shiver, and the air whooshes out under it.",
    level: "event",
    room: 0.12,
    cooldownMs: 250,
    render(mix) {
      mix.add(trampolineMat(mix));
    },
  },
  headCrashFanAir: {
    about: "Your car drives into a fan's rising air: a soft rush of air going up.",
    level: "quiet",
    room: 0.2,
    cooldownMs: 500,
    render(mix) {
      mix.add(swish(mix, { seconds: 0.6, fromHz: 450, toHz: 1_300, q: 0.9, peak: 0.3, grain: 0.1 }));
    },
  },
  headCrashLiftLoop: {
    about: "Loop: the lift in the middle of the map moving: its winch's low hum and gear teeth ticking, swelling as it speeds up and fading as it eases to a stop, a little higher going up than coming down. Silent while it waits.",
    level: "quiet",
    room: 0,
    loopSeconds: LIFT_SECONDS,
    render(mix) {
      mix.add(liftWinch(mix, LIFT_SECONDS + LOOP_CROSSFADE));
    },
  },
  headCrashCarBump: {
    about: "The two cars knock into each other (they are solid and push each other): two rubbery toys touching.",
    level: "tap",
    room: 0.08,
    cooldownMs: 220,
    render(mix) {
      mix.add(thump(mix, { hz: 156, drop: 1.25, decay: 0.03, drive: 1.3, box: 420 }));
      mix.add(woodTap(mix, { hz: 700, decay: 0.012, hardness: 0.35 }), { gain: 0.4 });
    },
  },
  headCrashYouScored: {
    about: "You hit the other driver's head, or they crashed their own (the burst, the shake, your score going up): a fat pop, a stamp, and two notes up.",
    level: "moment",
    room: 0.16,
    render(mix) {
      mix.add(stamp(mix, { weight: 0.75 }), { gain: 0.7 });
      mix.add(pop(mix, { note: "D5", from: 0.6, glide: 0.012, decay: 0.09 }));
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.4 }), { at: 0.09, gain: 0.7 });
      mix.add(mallet(mix, { note: "D5", ring: 0.2, hardness: 0.4 }), { at: 0.18, gain: 0.8 });
    },
  },
  headCrashYouWereHit: {
    about: "Your own head is hit (by the other car, the arena or the water) and the point goes to the other driver: a low blow under the shake, then two notes falling.",
    level: "moment",
    room: 0.26,
    render(mix) {
      mix.add(thump(mix, { hz: 94, drop: 2.2, decay: 0.13, drive: 1.6, box: 270 }), { gain: 0.85 });
      mix.add(pop(mix, { note: "B4", from: 1.3, glide: 0.03, decay: 0.05 }), { gain: 0.5 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.12, hardness: 0.22 }), { at: 0.14, gain: 0.7 });
      mix.add(mallet(mix, { note: "B3", ring: 0.2, hardness: 0.16 }), { at: 0.29, gain: 0.75 });
    },
  },
  headCrashBothHeadsHit: {
    about: "Both heads are hit at the same moment and nobody scores: a knock and a small scatter.",
    level: "event",
    room: 0.2,
    render(mix) {
      mix.add(thump(mix, { hz: 120, drop: 1.6, decay: 0.07, drive: 1.5, box: 300 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 620, decay: 0.018, hardness: 0.6 }), { gain: 0.5 });
      mix.add(scatter(mix, { pieces: 8, seconds: 0.26, lowHz: 800, highHz: 1_900 }), { at: 0.01, gain: 0.55 });
    },
  },
  headCrashWatchedHit: {
    about: "A head is hit in a match you are watching: the knock alone, from a little further away.",
    level: "quiet",
    room: 0.26,
    render(mix) {
      mix.add(thump(mix, { hz: 126, drop: 1.5, decay: 0.06, drive: 1.3, box: 310 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 600, decay: 0.016, hardness: 0.5 }), { gain: 0.45 });
    },
  },
  headCrashSplash: {
    about: "The rising water reaches a head: a soft wash of water over the hit.",
    level: "event",
    room: 0.3,
    render(mix) {
      mix.add(swish(mix, { seconds: 0.5, fromHz: 2_600, toHz: 500, q: 0.7, peak: 0.12, grain: 0.5 }), { gain: 0.7 });
      mix.add(thump(mix, { hz: 86, drop: 1.5, decay: 0.09, drive: 1.1, box: 240 }), { gain: 0.4 });
    },
  },
  headCrashWaterRising: {
    about: "The water starts to rise (its edge blinks white): a slow swell of air and one low note, a warning without alarm.",
    level: "quiet",
    room: 0.3,
    render(mix) {
      mix.add(swish(mix, { seconds: 0.9, fromHz: 400, toHz: 1_500, q: 0.9, peak: 0.7, grain: 0.2 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "B3", ring: 0.4, hardness: 0.15 }), { at: 0.1, gain: 0.7 });
    },
  },
});
