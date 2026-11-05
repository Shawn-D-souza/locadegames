import { highpass, lowpass } from "./filters";

/**
 * The one small room every sound plays in: a feedback delay network (a short, dark, soft-walled room, like a
 * bedroom). It's a big part of what makes them feel like one app. Baked into each sound when it renders,
 * so playing it costs nothing. Left and right differ, so it opens up on headphones; together they still sum cleanly.
 */

/** Delay line lengths in seconds: mutually prime-ish, so the tail stays smooth and doesn't ring. */
const LINES = [0.0053, 0.0079, 0.0113, 0.0149, 0.0191, 0.0233, 0.0277, 0.0331] as const;
/** Seconds for the tail to fall 60 dB. */
const DECAY = 0.42;
/** Each pass through the walls loses what's above this. */
const WALL_CUTOFF = 6_600;
const SEND_LOW_CUT = 320;
const SEND_HIGH_CUT = 5_200;
const ROOM_INPUT = 0.42;
/**
 * The room runs at this fraction of the sound's rate: nothing this dark needs more, and it's the most expensive
 * thing a sound does.
 */
const RATE_DIVIDER = 2;

/** How far down the room's tail is worth making. */
const TAIL_DEPTH_DB = 56;

/**
 * Seconds the tail keeps sounding after a sound stops, for this much room (0…1): the less room, the sooner it
 * falls under what can be heard, and making silence is most of the work a small sound takes.
 */
export function roomTail(room: number): number {
  if (room <= 0) return 0;
  const depth = Math.max(0, TAIL_DEPTH_DB + 20 * Math.log10(room));
  return (DECAY * depth) / 60;
}

/** The room's answer (stereo) to `input`. Both tracks are `input.length` long: pad the input for the tail. */
export function roomResponse(input: Float32Array, sampleRate: number): [Float32Array, Float32Array] {
  // Filtered twice, so nothing's left to fold back when every other sample is dropped.
  const send = lowpass(lowpass(highpass(input, sampleRate, SEND_LOW_CUT), sampleRate, SEND_HIGH_CUT), sampleRate, SEND_HIGH_CUT);
  const rate = sampleRate / RATE_DIVIDER;
  const length = Math.ceil(input.length / RATE_DIVIDER);
  const wall = Math.exp((-2 * Math.PI * WALL_CUTOFF) / rate);
  const lines = LINES.map((seconds) => new Float32Array(Math.round(seconds * rate)));
  const gains = LINES.map((seconds) => Math.pow(10, (-3 * seconds) / DECAY));
  const heads = new Int32Array(LINES.length);
  const damped = new Float64Array(LINES.length);
  const outs = new Float64Array(LINES.length);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let n = 0; n < LINES.length; n++) {
      outs[n] = lines[n]![heads[n]!]!;
      sum += outs[n]!;
    }
    // Different lines to each side, with signs that sum cleanly on a phone's one speaker.
    left[i] = outs[0]! - outs[2]! + outs[4]! - outs[6]! + (outs[1]! + outs[5]!) * 0.5;
    right[i] = outs[1]! - outs[3]! + outs[5]! - outs[7]! + (outs[2]! + outs[6]!) * 0.5;
    // Householder feedback: every line feeds every other, keeping the energy.
    const spread = (sum * 2) / LINES.length;
    for (let n = 0; n < LINES.length; n++) {
      damped[n] = damped[n]! * wall + (outs[n]! - spread) * gains[n]! * (1 - wall);
      const line = lines[n]!;
      line[heads[n]!] = damped[n]! + send[i * RATE_DIVIDER]! * ROOM_INPUT;
      heads[n] = heads[n]! + 1 === line.length ? 0 : heads[n]! + 1;
    }
  }
  return [backToRate(left, input.length), backToRate(right, input.length)];
}

function backToRate(track: Float32Array, length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const at = Math.floor(i / RATE_DIVIDER);
    const part = i / RATE_DIVIDER - at;
    out[i] = track[at]! + ((track[at + 1] ?? 0) - track[at]!) * part;
  }
  return out;
}
