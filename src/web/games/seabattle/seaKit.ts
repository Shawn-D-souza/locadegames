import { bandpass, highpass, lowpass, sweep } from "../../sound/dsp/filters";
import { ring } from "../../sound/dsp/modes";
import { addInto, envelope, noise, saturate, smooth, strike, toSamples, type Synth } from "../../sound/dsp/signal";

/**
 * Sea Battle's own instruments (owner decision: a real-sounding sea and guns, not the toy box's notes), all made from
 * scratch: a splash is thousands of tiny bubbles, each a little ring rising in pitch as it closes, choppy as real
 * water is; a gun or a hit is a burst of smooth noise darkening fast over a low punch; air is smooth, dark noise whose
 * brightness moves; a ship on the board is one hollow wooden thock; the cannon's metal is a click or a clunk.
 */

const between = (s: Synth, low: number, high: number) => low + (high - low) * s.random();
const peakOf = (track: Float32Array) => track.reduce((most, x) => Math.max(most, Math.abs(x)), 1e-9);

/** Smooth, dark noise (each sample leaning on the last): the soft "fff" of moving air, without white noise's rasp. Nothing under `lowCutHz`. */
export function softNoise(s: Synth, seconds: number, lowCutHz = 250): Float32Array {
  const out = new Float32Array(toSamples(s, seconds));
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    last = last * 0.97 + (s.random() * 2 - 1);
    out[i] = last;
  }
  return highpass(out, s.sampleRate, lowCutHz);
}

/**
 * Air moving as something is swung: smooth noise whose tone opens and swells, then fades (`rising`: opening as it
 * goes, a lift; otherwise opening and closing again, passing by). Only its brightness moves, never a narrow band,
 * so it's air, not sandpaper.
 */
export function airWhoosh(s: Synth, { seconds, fromHz, toHz, rising }: { seconds: number; fromHz: number; toHz: number; rising: boolean }): Float32Array {
  const air = sweep(softNoise(s, seconds), s.sampleRate, "low", (p) => fromHz + (toHz - fromHz) * (rising ? smooth(p) : Math.sin(Math.PI * p)), 0.7);
  const peak = rising ? 0.6 : 0.5;
  return envelope(s, air, (t) => {
    const p = Math.min(1, t / seconds);
    return p < peak ? Math.pow(Math.sin((Math.PI / 2) * (p / peak)), 1.5) : Math.pow(Math.cos((Math.PI / 2) * ((p - peak) / (1 - peak))), 2);
  });
}

/**
 * A cannon firing: one round "thoom", the low punch and a burst of smooth, dark noise starting together and
 * darkening as it fades. No separate crack, rumble or echo (owner: those read as several sounds).
 */
export function cannonBoom(s: Synth): Float32Array {
  const sr = s.sampleRate;
  const seconds = 0.5;
  const blast = sweep(softNoise(s, seconds, 90), sr, "low", (p) => 280 + 2_200 * Math.exp(-(p * seconds) / 0.04), 0.8);
  envelope(s, blast, (t) => Math.min(1, t / 0.0015) * (0.8 * Math.exp(-t / 0.07) + 0.2 * Math.exp(-t / 0.16)));
  const punch = ring(s, [
    { hz: between(s, 100, 110), amp: 1, decay: 0.08, from: 2.2, glide: 0.02, attack: 0.0015 },
    { hz: 175, amp: 0.45, decay: 0.05, from: 1.8, glide: 0.015, attack: 0.0015 },
  ]);
  const out = new Float32Array(blast.length);
  addInto(out, blast, 0, 1 / peakOf(blast));
  addInto(out, punch, 0, 0.9);
  return saturate(out, 1.3);
}

export interface ShipHitOptions {
  /** 1 your shot landing; more is nearer and heavier (your own ship). */
  weight: number;
  /** 1 as near as it gets; less is duller and further off (watching). */
  brightness: number;
}

/**
 * A cannonball tearing into a ship: one sharp "crack-thoom". The cannon's smooth blast made brighter and harder, its
 * low punch, and the wood splintering in the same instant, under one fade; no fire, debris or drops after it.
 */
export function shipHit(s: Synth, { weight, brightness }: ShipHitOptions): Float32Array {
  const sr = s.sampleRate;
  const seconds = 0.5 + 0.1 * weight;
  const blast = sweep(softNoise(s, seconds, 90), sr, "low", (p) => 300 + 3_400 * brightness * Math.exp(-(p * seconds) / 0.035), 0.8);
  envelope(s, blast, (t) => Math.min(1, t / 0.001) * (0.75 * Math.exp(-t / (0.06 * weight)) + 0.25 * Math.exp(-t / (0.17 * weight))));
  const punch = ring(s, [
    { hz: 96, amp: 1, decay: 0.09 * weight, from: 2.4, glide: 0.018, attack: 0.001 },
    { hz: 160, amp: 0.5, decay: 0.055 * weight, from: 2, glide: 0.014, attack: 0.001 },
  ]);
  // The splintering: a quick burst of small wooden cracks, all within the blast's first moment.
  const splinters = new Float32Array(toSamples(s, 0.1));
  for (let i = 0; i < 10; i++) {
    const hz = between(s, 900, 2_200) * (0.7 + 0.3 * brightness);
    const crack = ring(s, [{ hz, amp: 1, decay: between(s, 0.004, 0.01), attack: 0.0003 }]);
    addInto(splinters, crack, toSamples(s, 0.06 * Math.pow(i / 10, 1.5)), 1 - i * 0.07);
  }
  const out = new Float32Array(blast.length);
  addInto(out, blast, 0, 1 / peakOf(blast));
  addInto(out, punch, 0, 0.9);
  addInto(out, splinters, 0, 0.35 * brightness);
  return saturate(out, 1.5);
}

/** A wooden ship set down on the board: one rounded, hollow thock, its note dipping a hair as it settles. Lower `hz` is softer and duller. */
export function thock(s: Synth, { hz, decay = 0.04 }: { hz: number; decay?: number }): Float32Array {
  const out = ring(s, [
    { hz, amp: 1, decay, from: 1.12, glide: 0.006, attack: 0.0012 },
    { hz: hz * 2.13, amp: 0.4, decay: decay * 0.5, attack: 0.001 },
    { hz: hz * 3.4, amp: 0.15, decay: decay * 0.25, attack: 0.0008 },
  ]);
  // The touch itself: soft, not a click.
  addInto(out, envelope(s, lowpass(noise(s, 0.006), s.sampleRate, 2_200), strike(0.0006, 0.0015)), 0, 0.25);
  return saturate(out, 1.3);
}

/** A small, crisp metal click: a latch, a gear's detent. */
export function metalClick(s: Synth, { hz }: { hz: number }): Float32Array {
  const out = ring(s, [
    { hz, amp: 1, decay: 0.005, attack: 0.0002 },
    { hz: hz * 1.63, amp: 0.5, decay: 0.003, attack: 0.0002 },
  ]);
  addInto(out, envelope(s, bandpass(noise(s, 0.004), s.sampleRate, hz * 1.2, 1.2), strike(0.0001, 0.0008)), 0, 0.5);
  return out;
}

/** A heavy steel part sliding home: a dull low clunk with the ring of the metal round it. */
export function metalClunk(s: Synth): Float32Array {
  const out = saturate(
    ring(s, [
      { hz: 150, amp: 1, decay: 0.045, from: 1.5, glide: 0.008, attack: 0.0006 },
      { hz: 610, amp: 0.45, decay: 0.03, attack: 0.0004 },
      { hz: 990, amp: 0.35, decay: 0.022, attack: 0.0004 },
      { hz: 1_570, amp: 0.2, decay: 0.012, attack: 0.0003 },
    ]),
    1.6,
  );
  addInto(out, envelope(s, highpass(bandpass(noise(s, 0.01), s.sampleRate, 1_800, 0.8), s.sampleRate, 600), strike(0.0002, 0.002)), 0, 0.4);
  return out;
}

/** A splash's brightness: loudest here, falling away below (steadily) and above (slowly, then faster). */
const SPLASH_PEAK_HZ = 1_650;
const SPLASH_BELOW_DB_PER_OCTAVE = 7.5;
const SPLASH_ABOVE_DB_PER_OCTAVE = 4.5;
const SPLASH_TOP_FROM_OCTAVES = 2;
const SPLASH_TOP_DB_PER_OCTAVE = 15;
/**
 * Its course. First the slap as the water's surface breaks: a short burst, bright in the highs (the "ksh") and faint
 * below, gone again in a moment (dB from the body, when, how long). Then the body swells in fast, holds, eases down and
 * fades away (seconds, and dB a second). Held level the whole way, it's surf, not a splash.
 */
const SPLASH_SLAP_DB = -10;
const SPLASH_SLAP_HIGH_DB = 10;
const SPLASH_SLAP_HIGH_FROM_HZ = 3_000;
const SPLASH_SLAP_AT = 0.03;
const SPLASH_SLAP_SECONDS = 0.012;
const SPLASH_BODY_FROM = 0.045;
const SPLASH_SWELL = 0.04;
/** How the swell climbs: slowly at first, faster near the top (its power goes with time to this power). */
const SPLASH_SWELL_CURVE = 2.5;
const SPLASH_EASE_FROM = 0.3;
const SPLASH_EASE_DB_PER_SECOND = 20;
const SPLASH_FADE_FROM = 0.62;
const SPLASH_FADE_DB_PER_SECOND = 50;
const SPLASH_SECONDS = 1;
/** The water heaving: the whole splash surges and lulls together a few dB, a new swing every so often (seconds). */
const SPLASH_SURGE_STEP = 0.08;
const SPLASH_SURGE_DB = 3;
/** Its last moments fade to nothing, so it never stops dead. */
const SPLASH_END_FADE = 0.15;
/**
 * Its choppiness, what makes it a splash and not surf: every band jumps up and down a few dB every few milliseconds
 * (the lows more), neighbouring bands partly together.
 */
const SPLASH_FLICKER_STEP = 0.003;
const SPLASH_FLICKER_DB = 2.7;
const SPLASH_LOW_FLICKER_DB = 5;
const SPLASH_LOW_FLICKER_BELOW_HZ = 300;
const SPLASH_FLICKER_SHARED = 0.6;
/** The bands it's made in (a third of an octave or so apart), the bubbles a second in each, and how long each rings (cycles). */
const SPLASH_BANDS = 18;
const SPLASH_LOW_HZ = 110;
const SPLASH_HIGH_HZ = 11_000;
const SPLASH_BUBBLE_RATE = 900;
const SPLASH_CYCLES = 3;

/** How loud the splash is at a pitch, in dB from its loudest. */
function splashBrightness(hz: number): number {
  const octaves = Math.log2(hz / SPLASH_PEAK_HZ);
  if (octaves <= 0) return SPLASH_BELOW_DB_PER_OCTAVE * octaves;
  const top = Math.max(0, octaves - SPLASH_TOP_FROM_OCTAVES);
  return -SPLASH_ABOVE_DB_PER_OCTAVE * Math.min(octaves, SPLASH_TOP_FROM_OCTAVES) - SPLASH_TOP_DB_PER_OCTAVE * top;
}

/** How loud the splash is at a moment in a band, in dB from its body's loudest. */
function splashCourse(t: number, hz: number): number {
  const slapDb = SPLASH_SLAP_DB + (hz >= SPLASH_SLAP_HIGH_FROM_HZ ? SPLASH_SLAP_HIGH_DB : 0);
  // Nothing before the slap: the burst comes out of silence.
  const slapAt = (t - SPLASH_SLAP_AT) / SPLASH_SLAP_SECONDS;
  const slap = slapAt < -2 ? 0 : Math.pow(10, slapDb / 10) * Math.exp(-(slapAt ** 2));
  const swell = Math.min(1, Math.max(0, t - SPLASH_BODY_FROM) / SPLASH_SWELL);
  const ease = SPLASH_EASE_DB_PER_SECOND * Math.max(0, t - SPLASH_EASE_FROM) + SPLASH_FADE_DB_PER_SECOND * Math.max(0, t - SPLASH_FADE_FROM);
  const body = Math.pow(swell, SPLASH_SWELL_CURVE) * Math.pow(10, -ease / 10);
  return 10 * Math.log10(slap + body + 1e-12);
}

/**
 * A splash, made of bubbles only: in each band, a steady stream of tiny pings at random pitches inside it, each a few
 * cycles long (a ping, not a note: one long note sounds like a string, plain noise like paper), rising a little as it
 * closes; each as loud as the splash's brightness and course say for its pitch and moment. A dense fizz, loudest in
 * the upper middle, choppy (every band jumping up and down every few milliseconds: smooth, it's surf): a bright slap,
 * then the body swelling in, surging and lulling as it holds, and fading away over about a second.
 */
export function bubbleSplash(s: Synth): Float32Array {
  const sr = s.sampleRate;
  const seconds = SPLASH_SECONDS;
  const out = new Float32Array(toSamples(s, seconds + 0.05));
  const length = seconds * sr;
  const steps = Math.ceil(seconds / SPLASH_FLICKER_STEP);
  // Roughly bell-shaped random numbers (four even ones added), spread 1.
  const wobble = () => (s.random() + s.random() + s.random() + s.random() - 2) * Math.sqrt(3);
  const shared = Array.from({ length: steps }, wobble);
  const surges = Array.from({ length: Math.ceil(seconds / SPLASH_SURGE_STEP) + 2 }, () => SPLASH_SURGE_DB * wobble());
  // Each swing eases into the next (straight lines between them).
  const surge = (t: number) => {
    const at = t / SPLASH_SURGE_STEP;
    const i = Math.floor(at);
    return surges[i]! + (surges[i + 1]! - surges[i]!) * (at - i);
  };
  for (let band = 0; band < SPLASH_BANDS; band++) {
    const hz = SPLASH_LOW_HZ * Math.pow(SPLASH_HIGH_HZ / SPLASH_LOW_HZ, band / (SPLASH_BANDS - 1));
    const spread = hz < SPLASH_LOW_FLICKER_BELOW_HZ ? SPLASH_LOW_FLICKER_DB : SPLASH_FLICKER_DB;
    const flicker = shared.map((common) => spread * (Math.sqrt(SPLASH_FLICKER_SHARED) * common + Math.sqrt(1 - SPLASH_FLICKER_SHARED) * wobble()));
    const count = Math.round(SPLASH_BUBBLE_RATE * seconds);
    for (let b = 0; b < count; b++) {
      const start = Math.floor(s.random() * length);
      const t = start / sr;
      const end = Math.min(1, (seconds - t) / SPLASH_END_FADE);
      const chop = flicker[Math.min(steps - 1, Math.floor(t / SPLASH_FLICKER_STEP))]!;
      const power = Math.pow(10, (splashBrightness(hz) + splashCourse(t, hz) + surge(t) + chop) / 10) * end * end;
      const f = hz * Math.pow(2, (s.random() - 0.5) * 0.37);
      const decay = (SPLASH_CYCLES * (0.7 + 0.6 * s.random())) / f;
      // As loud as the power asks of this many bubbles this long: a ping's energy is about amp² × decay / 4.
      const amp = Math.sqrt((4 * power) / (SPLASH_BUBBLE_RATE * decay));
      const rise = 0.05 + 0.15 * s.random();
      const attack = Math.max(0.0002, 0.25 / f);
      const ring = Math.min(out.length - start, Math.ceil(decay * 6 * sr));
      // The fade stepped by one multiplication a sample (an exponential per sample made this the slowest sound to build).
      const step = Math.exp(-1 / (decay * sr));
      const turn = (2 * Math.PI * f) / sr;
      const attackSamples = attack * sr;
      let fade = 1;
      let phase = 0;
      for (let i = 0; i < ring; i++) {
        phase += turn * (1 + rise * (1 - fade));
        out[start + i]! += Math.sin(phase) * Math.min(1, i / attackSamples) * fade * amp;
        fade *= step;
      }
    }
  }
  return out;
}
