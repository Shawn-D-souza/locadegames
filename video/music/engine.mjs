// A small offline synthesizer: instruments render notes into stereo buses; buses mix through reverb, delay,
// sidechain and a mastering limiter into a WAV. Everything is deterministic (seeded noise).
import { writeFileSync } from "node:fs";

export const SR = 44100;
const TAU = Math.PI * 2;

// ---------- basics ----------
let seed = 12345;
export function reseed(s) { seed = s >>> 0 || 1; }
export function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; }
export const noise = () => rnd() * 2 - 1;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const N = (sec) => Math.max(1, Math.round(sec * SR));

function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
export class Osc {
  constructor(phase = 0) { this.p = phase; }
  saw(f) { const dt = f / SR; let v = 2 * this.p - 1 - polyblep(this.p, dt); this.p += dt; if (this.p >= 1) this.p -= 1; return v; }
  pulse(f, w = 0.5) { const dt = f / SR; let v = this.p < w ? 1 : -1; v += polyblep(this.p, dt); v -= polyblep((this.p + 1 - w) % 1, dt); this.p += dt; if (this.p >= 1) this.p -= 1; return v; }
  sin(f) { const v = Math.sin(TAU * this.p); this.p += f / SR; if (this.p >= 1) this.p -= 1; return v; }
  tri(f) { const v = 1 - 4 * Math.abs(this.p - 0.5); this.p += f / SR; if (this.p >= 1) this.p -= 1; return v; }
}

// Zavalishin TPT state-variable filter: stable under fast cutoff changes.
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  run(x, fc, q = 0.707) {
    fc = Math.min(Math.max(fc, 10), SR * 0.45);
    const g = Math.tan(Math.PI * fc / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.ic2, v1 = a1 * this.ic1 + a2 * v3, v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2; this.bp = v1; this.hp = x - k * v1 - v2;
    return this;
  }
}
export class OnePole { constructor() { this.z = 0; } lp(x, fc) { const a = Math.exp(-TAU * fc / SR); this.z = x * (1 - a) + this.z * a; return this.z; } }

// attack / decay-to-sustain / release, times in seconds; `len` = gate length
export function adsr(t, len, a, d, s, r) {
  if (t <= len) return envAt(t, a, d, s);
  const k = (t - len) / r;
  return k >= 1 ? 0 : envAt(len, a, d, s) * (1 - k) * (1 - k);
}
function envAt(t, a, d, s) { return t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : s; }
const expd = (t, tau) => Math.exp(-t / tau);
const sat = (x, d = 1) => Math.tanh(x * d) / Math.tanh(d);

// ---------- buses ----------
export class Bus {
  constructor(seconds) { this.L = new Float32Array(N(seconds)); this.R = new Float32Array(N(seconds)); }
  add(buf, at, gain = 1, pan = 0) { // buf: Float32Array mono or [L,R]
    const s0 = Math.round(at * SR);
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    const stereo = Array.isArray(buf), L = stereo ? buf[0] : buf, R = stereo ? buf[1] : buf;
    for (let i = 0; i < L.length; i++) { const j = s0 + i; if (j < 0) continue; if (j >= this.L.length) break; this.L[j] += L[i] * gl; this.R[j] += R[i] * gr; }
  }
}

// ---------- instruments (each returns a mono Float32Array or [L,R]) ----------
export function kick({ punch = 1, decay = 0.32, tone = 46, click = 0.35, drive = 1.6 } = {}) {
  const n = N(decay * 2.2 + 0.05), out = new Float32Array(n); let ph = 0; const hp = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = tone + 120 * punch * expd(t, 0.028) + 260 * expd(t, 0.0035);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * (t < 0.002 ? t / 0.002 : 1) * expd(t, decay);
    const c = hp.run(noise(), 1800).hp * expd(t, 0.004) * click;
    out[i] = sat(body + c, drive);
  }
  return out;
}
export function snare({ tone = 190, decay = 0.16, snap = 1, body = 0.6 } = {}) {
  const n = N(decay * 3), out = new Float32Array(n); const o1 = new Osc(), o2 = new Osc(), f = new SVF(), f2 = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR, pd = 1 + 0.4 * expd(t, 0.01);
    const b = (o1.sin(tone * pd) * 0.7 + o2.sin(tone * 1.72 * pd) * 0.35) * expd(t, 0.055) * body;
    const nz = f2.run(f.run(noise(), 1400).hp, 7000, 0.6).lp * expd(t, decay) * snap;
    out[i] = sat(b + nz * 0.9, 1.3);
  }
  return out;
}
export function clap({ decay = 0.14, bright = 1200 } = {}) {
  const n = N(0.04 + decay * 3.5), out = new Float32Array(n); const f = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let e = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) e = Math.max(e, expd(t - o, 0.0055));
    if (t >= 0.032) e = Math.max(e, 0.75 * expd(t - 0.032, decay));
    out[i] = f.run(noise(), bright, 1.1).bp * e * 2.2;
  }
  return out;
}
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540, 800];
export function hat({ decay = 0.035, open = false, bright = 1 } = {}) {
  const d = open ? Math.max(decay, 0.22) : decay;
  const n = N(d * 4), out = new Float32Array(n); const os = HAT_F.map(() => new Osc(rnd())); const hp = new SVF(), bp = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 0;
    for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_F[k] * 1.7);
    const x = m / 6 * 0.6 + noise() * 0.4;
    out[i] = bp.run(hp.run(x, 7000 * bright).hp, 10500 * bright, 0.9).bp * expd(t, d) * 1.6;
  }
  return out;
}
export function shaker({ decay = 0.05 } = {}) {
  const n = N(decay * 4), out = new Float32Array(n); const f = new SVF();
  for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / 0.012) * expd(t, decay); out[i] = f.run(noise(), 6500, 1.2).bp * e; }
  return out;
}
export function crash({ decay = 1.4, bright = 1 } = {}) {
  const n = N(decay * 3), L = new Float32Array(n), R = new Float32Array(n);
  const os = HAT_F.map(() => new Osc(rnd())); const h1 = new SVF(), h2 = new SVF(), l1 = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 0; for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_F[k] * 2.3);
    const e = expd(t, decay) * (0.6 + 0.4 * expd(t, 0.08));
    const a = h1.run(m / 6 * 0.5 + noise() * 0.5, 4500 * bright).hp, b = h2.run(noise(), 5000 * bright).hp;
    L[i] = l1.run(a, 14000).lp * e; R[i] = (a * 0.5 + b * 0.5) * e;
  }
  return [L, R];
}
export function tom(midi, { decay = 0.25 } = {}) {
  const n = N(decay * 3), out = new Float32Array(n); let ph = 0; const f0 = mtof(midi);
  for (let i = 0; i < n; i++) { const t = i / SR; ph += f0 * (1 + 0.5 * expd(t, 0.03)) / SR; out[i] = sat(Math.sin(TAU * ph) * expd(t, decay) + noise() * 0.1 * expd(t, 0.01), 1.4); }
  return out;
}

// bass: sub sine + filtered saw; `bright` sets how far the filter opens
export function bass(midi, len, { bright = 900, env = 1500, q = 0.9, sub = 0.85, grit = 0.5, decay = 0.15, rel = 0.03, glideFrom = null } = {}) {
  const n = N(len + rel), out = new Float32Array(n); const s = new Osc(), a = new Osc(0.3), b = new Osc(0.7), f = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let fr = mtof(midi);
    if (glideFrom !== null) fr = mtof(glideFrom + (midi - glideFrom) * Math.min(1, t / 0.06));
    const amp = adsr(t, len, 0.004, 0.08, 0.85, rel);
    const cut = bright + env * expd(t, decay);
    const saws = (a.saw(fr) + b.saw(fr * 1.004)) * 0.5;
    const mid = f.run(saws, cut, q).lp;
    out[i] = sat((s.sin(fr) * sub + mid * grit) * amp, 1.5);
  }
  return out;
}
export function slapBass(midi, len, { pop = false } = {}) {
  const n = N(len + 0.04), out = new Float32Array(n); const a = new Osc(), b = new Osc(), s = new Osc(), f = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR, fr = mtof(midi) * (1 + 0.03 * expd(t, 0.008));
    const amp = adsr(t, len, 0.002, 0.12, 0.55, 0.04);
    const cut = (pop ? 900 : 350) + (pop ? 5200 : 3000) * expd(t, pop ? 0.05 : 0.07);
    const x = f.run(a.pulse(fr, 0.4) * 0.6 + b.saw(fr) * 0.5, cut, 2.2).lp;
    const click = noise() * expd(t, 0.002) * (pop ? 0.5 : 0.25);
    out[i] = sat((x * 0.8 + s.sin(fr) * 0.6 + click) * amp, 1.8);
  }
  return out;
}

// subtractive pluck
export function pluck(midi, { decay = 0.28, bright = 5200, len = 0.4, voices = 2, q = 1.2, floor = 500 } = {}) {
  const n = N(len + 0.3), L = new Float32Array(n), R = new Float32Array(n);
  const det = voices === 1 ? [0] : [-0.08, 0.08];
  const os = det.map(() => new Osc(rnd())), fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR, f0 = mtof(midi);
    const v = os.map((o, k) => o.saw(f0 * Math.pow(2, det[k] / 12)));
    const cut = floor + bright * expd(t, decay * 0.35);
    const amp = (t < 0.002 ? t / 0.002 : 1) * expd(t, decay) * (t > len ? Math.max(0, 1 - (t - len) / 0.1) : 1);
    L[i] = fl.run(v[0], cut, q).lp * amp; R[i] = fr.run(v[v.length - 1], cut, q).lp * amp;
  }
  return [L, R];
}

// modal marimba / mallet
export function mallet(midi, { decay = 0.55, hard = 0.6 } = {}) {
  const f0 = mtof(midi), parts = [[1, 1, 1], [3.93, 0.32 * hard + 0.1, 0.22], [9.2, 0.12 * hard, 0.07]];
  const d = decay * Math.min(1.6, Math.max(0.35, 400 / f0));
  const n = N(d * 4 + 0.05), out = new Float32Array(n); const os = parts.map(() => new Osc()); const f = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (let k = 0; k < parts.length; k++) { const [r, a, dd] = parts[k]; if (f0 * r < SR * 0.45) v += os[k].sin(f0 * r) * a * expd(t, d * dd); }
    const click = f.run(noise(), f0 * 4, 1).bp * expd(t, 0.003) * 0.4 * hard;
    out[i] = (v + click) * Math.min(1, t / 0.0015);
  }
  return out;
}
export function glock(midi, { decay = 1.1 } = {}) {
  const f0 = mtof(midi), parts = [[1, 1, 1], [2.76, 0.4, 0.45], [5.4, 0.22, 0.22], [8.93, 0.1, 0.12]];
  const n = N(decay * 3.5), out = new Float32Array(n); const os = parts.map(() => new Osc());
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (let k = 0; k < parts.length; k++) { const [r, a, dd] = parts[k]; if (f0 * r < SR * 0.45) v += os[k].sin(f0 * r) * a * expd(t, decay * dd); }
    out[i] = v * Math.min(1, t / 0.001);
  }
  return out;
}
// FM electric-piano / tine bell
export function tine(midi, len, { index = 2.2, bell = 0.35, decay = 1.2, rel = 0.25 } = {}) {
  const f0 = mtof(midi), n = N(len + rel + 0.05), out = new Float32Array(n);
  let pc = 0, pm = 0, pb = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ix = index * (0.25 + 0.75 * expd(t, 0.25));
    pm += f0 / SR; pb += f0 * 14 / SR;
    const mod = Math.sin(TAU * pm) * ix + Math.sin(TAU * pb) * bell * 3 * expd(t, 0.02);
    pc += f0 / SR;
    const env = Math.min(1, t / 0.002) * expd(t, decay) * (t > len ? Math.max(0, 1 - (t - len) / rel) : 1);
    out[i] = Math.sin(TAU * pc + mod) * env;
  }
  return out;
}

// detuned saw stack, stereo; `chord` = midi notes
export function supersaw(chord, len, { a = 0.01, d = 0.3, s = 0.8, r = 0.25, cut = 4000, cutEnv = 0, cutDecay = 0.3, q = 0.8, voices = 7, spread = 22, lfoRate = 0, lfoDepth = 0 } = {}) {
  const n = N(len + r + 0.02), L = new Float32Array(n), R = new Float32Array(n);
  const cents = Array.from({ length: voices }, (_, k) => voices === 1 ? 0 : (k / (voices - 1) * 2 - 1) * spread);
  const oscs = chord.map(() => cents.map(() => new Osc(rnd())));
  const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; let l = 0, rr = 0;
    for (let c = 0; c < chord.length; c++) {
      const f0 = mtof(chord[c]);
      for (let k = 0; k < cents.length; k++) {
        const v = oscs[c][k].saw(f0 * Math.pow(2, cents[k] / 1200));
        const p = cents.length === 1 ? 0.5 : k / (cents.length - 1);
        l += v * (1 - p * 0.8); rr += v * (0.2 + p * 0.8);
      }
    }
    const norm = 1 / (Math.sqrt(chord.length) * Math.sqrt(cents.length));
    const c0 = cut * (1 + cutEnv * expd(t, cutDecay)) * (1 + lfoDepth * Math.sin(TAU * lfoRate * t));
    const env = adsr(t, len, a, d, s, r);
    L[i] = fl.run(l * norm, c0, q).lp * env; R[i] = fr.run(rr * norm, c0, q).lp * env;
  }
  return [L, R];
}

// formant "vocal" chop: a saw through vowel formants, with a small scoop into the note
const VOWELS = { a: [[730, 1], [1090, 0.5], [2440, 0.28]], o: [[570, 1], [840, 0.45], [2410, 0.2]], e: [[400, 1], [2000, 0.4], [2600, 0.25]], u: [[320, 1], [800, 0.35], [2240, 0.12]], i: [[280, 1], [2250, 0.35], [2900, 0.3]] };
export function vox(midi, len, { vowel = "a", to = null, scoop = 0.7, vib = 0.12, breath = 0.08 } = {}) {
  const n = N(len + 0.08), out = new Float32Array(n); const o = new Osc(), o2 = new Osc(0.5);
  const A = VOWELS[vowel], B = VOWELS[to || vowel]; const fs = A.map(() => new SVF()); const hp = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR, m = Math.min(1, t / Math.max(len, 0.05));
    const semis = -scoop * expd(t, 0.035) + vib * Math.sin(TAU * 5.5 * t) * Math.min(1, t / 0.25);
    const f0 = mtof(midi + semis);
    const src = o.saw(f0) * 0.7 + o2.pulse(f0 * 1.003, 0.3) * 0.3 + noise() * breath;
    let v = 0;
    for (let k = 0; k < 3; k++) { const ff = A[k][0] + (B[k][0] - A[k][0]) * m, aa = A[k][1] + (B[k][1] - A[k][1]) * m; v += fs[k].run(src, ff, ff / 90).bp * aa * (90 / ff); }
    const env = adsr(t, len, 0.012, 0.1, 0.8, 0.07);
    out[i] = hp.run(v, 180).hp * env * 1.6;
  }
  return out;
}

// brass stab: saws with a filter that blats open, a scoop and late vibrato
export function brass(chord, len, { bright = 1, rel = 0.12 } = {}) {
  const n = N(len + rel + 0.02), L = new Float32Array(n), R = new Float32Array(n);
  const os = chord.map(() => [new Osc(rnd()), new Osc(rnd()), new Osc(rnd())]); const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR, sc = -0.35 * expd(t, 0.03), vb = 0.08 * Math.sin(TAU * 5.8 * t) * Math.min(1, Math.max(0, (t - 0.25) / 0.3));
    let l = 0, r = 0;
    for (let c = 0; c < chord.length; c++) {
      const f0 = mtof(chord[c] + sc + vb);
      const a = os[c][0].saw(f0 * 0.997), b = os[c][1].saw(f0), cc = os[c][2].saw(f0 * 1.003);
      l += a + b * 0.6; r += cc + b * 0.6;
    }
    const env = adsr(t, len, 0.02, 0.15, 0.7, rel);
    const cut = (500 + 3800 * bright * Math.min(1, t / 0.035) * (0.55 + 0.45 * expd(t, 0.12))) * (0.4 + 0.6 * env);
    const g = 0.5 / chord.length;
    L[i] = sat(fl.run(l * g, cut, 0.9).lp * env, 1.3); R[i] = sat(fr.run(r * g, cut, 0.9).lp * env, 1.3);
  }
  return [L, R];
}
export function clav(midi, len) {
  const n = N(len + 0.05), out = new Float32Array(n); const o = new Osc(), f = new SVF(), h = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR; const f0 = mtof(midi);
    const env = adsr(t, len, 0.001, 0.09, 0.35, 0.03);
    const x = f.run(o.pulse(f0, 0.22), 1200 + 4000 * expd(t, 0.04), 2.5).lp;
    out[i] = h.run(x, 250).hp * env;
  }
  return out;
}

// ---------- effects ----------
export function riser(len, { from = 300, to = 9000, tonal = true, gainCurve = 2 } = {}) {
  const n = N(len), L = new Float32Array(n), R = new Float32Array(n);
  const fl = new SVF(), fr = new SVF(), o = new Osc(), o2 = new Osc(0.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, m = t / len, fc = from * Math.pow(to / from, m), g = Math.pow(m, gainCurve);
    const tone = tonal ? (o.saw(110 * Math.pow(8, m)) + o2.saw(110 * Math.pow(8, m) * 1.01)) * 0.12 * m : 0;
    L[i] = (fl.run(noise(), fc, 1.6).bp + tone) * g; R[i] = (fr.run(noise(), fc * 1.05, 1.6).bp + tone) * g;
  }
  return [L, R];
}
export function downlifter(len, { from = 7000, to = 200 } = {}) {
  const n = N(len), L = new Float32Array(n), R = new Float32Array(n); const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) { const t = i / SR, m = t / len, fc = from * Math.pow(to / from, m), g = Math.pow(1 - m, 1.5); L[i] = fl.run(noise(), fc, 1.2).bp * g; R[i] = fr.run(noise(), fc * 0.95, 1.2).bp * g; }
  return [L, R];
}
export function impact({ decay = 1.6 } = {}) {
  const n = N(decay * 3), out = new Float32Array(n); let ph = 0; const f = new SVF();
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (38 + 90 * expd(t, 0.06)) / SR; out[i] = sat(Math.sin(TAU * ph) * expd(t, decay) + f.run(noise(), 600).lp * expd(t, 0.15) * 0.6, 1.6); }
  return out;
}
export function reverse(buf) { const r = (b) => Float32Array.from(b).reverse(); return Array.isArray(buf) ? [r(buf[0]), r(buf[1])] : r(buf); }

// Freeverb
const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], APS = [556, 441, 341, 225];
export function reverb(bus, { room = 0.84, damp = 0.35, predelay = 0.02, width = 1, lowcut = 250 } = {}) {
  const n = bus.L.length, out = new Bus(n / SR);
  const pd = N(predelay), hpL = new SVF(), hpR = new SVF();
  const ch = (spread) => ({ c: COMBS.map((d) => ({ b: new Float32Array(d + spread), i: 0, z: 0 })), a: APS.map((d) => ({ b: new Float32Array(d + spread), i: 0 })) });
  const cl = ch(0), cr = ch(23);
  const proc = (c, x) => {
    let y = 0;
    for (const k of c.c) { const o = k.b[k.i]; k.z = o * (1 - damp) + k.z * damp; k.b[k.i] = x + k.z * room; k.i = (k.i + 1) % k.b.length; y += o; }
    for (const k of c.a) { const o = k.b[k.i]; const v = -y + o; k.b[k.i] = y + o * 0.5; k.i = (k.i + 1) % k.b.length; y = v; }
    return y;
  };
  for (let i = 0; i < n; i++) {
    const j = i - pd, xl = j >= 0 ? bus.L[j] : 0, xr = j >= 0 ? bus.R[j] : 0;
    const x = hpL.run((xl + xr) * 0.5, lowcut).hp * 0.03;
    const yl = proc(cl, x), yr = proc(cr, x);
    out.L[i] = yl * (0.5 + width / 2) + yr * (0.5 - width / 2); out.R[i] = yr * (0.5 + width / 2) + yl * (0.5 - width / 2);
  }
  return out;
}
export function pingpong(bus, { time = 0.375, fb = 0.4, tone = 3500 } = {}) {
  const n = bus.L.length, d = N(time), out = new Bus(n / SR), bl = new Float32Array(d), br = new Float32Array(d); let p = 0; const fl = new OnePole(), fr = new OnePole();
  for (let i = 0; i < n; i++) {
    const ol = bl[p], or = br[p];
    bl[p] = fl.lp((bus.L[i] + bus.R[i]) * 0.5 + or * fb, tone); br[p] = fr.lp(ol * fb, tone);
    out.L[i] = ol; out.R[i] = or; p = (p + 1) % d;
  }
  return out;
}
// gain curve that ducks after every kick time (seconds)
export function sidechain(seconds, kicks, { depth = 0.7, release = 0.22, attack = 0.004 } = {}) {
  const g = new Float32Array(N(seconds)).fill(1);
  for (const k of kicks) {
    const s0 = Math.round(k * SR), na = N(attack), nr = N(release);
    for (let i = 0; i < na + nr; i++) {
      const j = s0 + i; if (j >= g.length) break;
      const v = i < na ? 1 - depth * (i / na) : 1 - depth * Math.pow(1 - (i - na) / nr, 2);
      if (v < g[j]) g[j] = v;
    }
  }
  return g;
}
export function applyGain(bus, g) { for (let i = 0; i < bus.L.length; i++) { bus.L[i] *= g[i]; bus.R[i] *= g[i]; } return bus; }
export function eqBus(bus, { hp = 0, lp = 0 } = {}) {
  const a = [new SVF(), new SVF()], b = [new SVF(), new SVF()];
  for (let i = 0; i < bus.L.length; i++) {
    let l = bus.L[i], r = bus.R[i];
    if (hp) { l = a[0].run(l, hp).hp; r = a[1].run(r, hp).hp; }
    if (lp) { l = b[0].run(l, lp).lp; r = b[1].run(r, lp).lp; }
    bus.L[i] = l; bus.R[i] = r;
  }
  return bus;
}

// ---------- master ----------
export function master(buses, { target = 0.89, drive = 1.15, lookahead = 0.005, release = 0.12 } = {}) {
  const n = Math.max(...buses.map(([b]) => b.L.length));
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const [b, g] of buses) for (let i = 0; i < b.L.length; i++) { L[i] += b.L[i] * g; R[i] += b.R[i] * g; }
  const hl = new SVF(), hr = new SVF();
  for (let i = 0; i < n; i++) { L[i] = hl.run(L[i], 28).hp; R[i] = hr.run(R[i], 28).hp; }
  // normalise before the limiter so `drive` means the same in every song
  let rms = 0; for (let i = 0; i < n; i++) rms += L[i] * L[i] + R[i] * R[i]; rms = Math.sqrt(rms / (2 * n)) || 1;
  const pre = (0.2 / rms) * drive;
  for (let i = 0; i < n; i++) { L[i] = sat(L[i] * pre, 0.6); R[i] = sat(R[i] * pre, 0.6); }
  // look-ahead brick-wall limiter
  const la = N(lookahead), need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = p > target ? target / p : 1; }
  const gmin = new Float32Array(n); const dq = []; // sliding minimum over [i, i+la]
  for (let i = n - 1; i >= 0; i--) { while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop(); dq.push(i); while (dq[0] > i + la) dq.shift(); gmin[i] = need[dq[0]]; }
  // instant attack, smooth release, then a box average over the look-ahead so the drop is a ramp that
  // has fully arrived when the peak does
  const h = new Float32Array(n); let g = 1; const rel = Math.exp(-1 / (release * SR));
  for (let i = 0; i < n; i++) { g = gmin[i] < g ? gmin[i] : gmin[i] + (g - gmin[i]) * rel; h[i] = g; }
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += h[i]; if (i >= la) acc -= h[i - la];
    const gg = acc / Math.min(i + 1, la);
    L[i] *= gg; R[i] *= gg;
  }
  for (let i = 0; i < n; i++) { L[i] = Math.max(-0.99, Math.min(0.99, L[i])); R[i] = Math.max(-0.99, Math.min(0.99, R[i])); }
  // fade the very end
  const f = N(0.4); for (let i = 0; i < f; i++) { const k = i / f; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}

export function writeWav(path, [L, R]) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(L[i] * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * 32767), 46 + i * 4); }
  writeFileSync(path, buf);
}

// ---------- song helper ----------
export function song(bpm, seconds) {
  const beat = 60 / bpm;
  const at = (bar, b = 0) => (bar * 4 + b) * beat;
  const buses = { drums: new Bus(seconds), bass: new Bus(seconds), music: new Bus(seconds), lead: new Bus(seconds), fx: new Bus(seconds), verb: new Bus(seconds), echo: new Bus(seconds) };
  const kicks = [];
  // place with optional reverb / delay sends
  const put = (bus, buf, t, gain = 1, pan = 0, rv = 0, dl = 0) => {
    buses[bus].add(buf, t, gain, pan);
    if (rv) buses.verb.add(buf, t, gain * rv, pan);
    if (dl) buses.echo.add(buf, t, gain * dl, pan);
  };
  return { beat, at, buses, kicks, put, seconds };
}
