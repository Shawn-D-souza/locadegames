import * as E from "./engine.mjs";

const rms = (b) => { let s = 0; for (let i = 0; i < b.L.length; i++) s += b.L[i] ** 2 + b.R[i] ** 2; return Math.sqrt(s / (2 * b.L.length)); };

// sidechain, sends, master, write; prints each bus's level so the balance can be checked
export function finish(S, name, { out = null, trimDb = 0, scBass = 0.75, scMusic = 0.5, scLead = 0.15, scRelease = 0.6, verb = 2.2, echo = 0.9, echoBeats = 0.75, room = 0.84, gains = {} } = {}) {
  const { buses, kicks, seconds, beat } = S;
  const rel = beat * scRelease;
  E.applyGain(buses.bass, E.sidechain(seconds, kicks, { depth: scBass, release: rel }));
  E.applyGain(buses.music, E.sidechain(seconds, kicks, { depth: scMusic, release: rel }));
  E.applyGain(buses.lead, E.sidechain(seconds, kicks, { depth: scLead, release: rel }));
  const dl = E.pingpong(buses.echo, { time: beat * echoBeats, fb: 0.38 });
  const both = new E.Bus(seconds);
  for (let i = 0; i < both.L.length; i++) { both.L[i] = buses.verb.L[i] + dl.L[i] * 0.3; both.R[i] = buses.verb.R[i] + dl.R[i] * 0.3; }
  const rv = E.reverb(both, { room });
  E.applyGain(rv, E.sidechain(seconds, kicks, { depth: 0.35, release: rel }));
  const g = { drums: 1, bass: 1, music: 1, lead: 1, fx: 1, verb: verb, echo: echo, ...gains };
  const list = [[buses.drums, g.drums], [buses.bass, g.bass], [buses.music, g.music], [buses.lead, g.lead], [buses.fx, g.fx], [rv, g.verb], [dl, g.echo]];
  const names = ["drums", "bass", "music", "lead", "fx", "verb", "echo"];
  console.log(name, names.map((n, i) => `${n} ${(20 * Math.log10(rms(list[i][0]) * list[i][1] + 1e-9)).toFixed(1)}`).join("  "));
  const mix = E.master(list);
  const k = Math.pow(10, trimDb / 20);
  for (const ch of mix) for (let i = 0; i < ch.length; i++) ch[i] *= k;
  E.writeWav(out ?? new URL(`./out/${name}.wav`, import.meta.url).pathname, mix);
}

// 16-step pattern string -> beat offsets ("x" hit, "o" accent/alt, "." rest)
export const steps = (p) => [...p].map((c, i) => [c, i / 4]).filter(([c]) => c !== ".");

// D major pentatonic harmony (melody notes D E F# A B only; G is only ever a bass root)
export const CH = {
  D: { root: 38, pad: [62, 66, 69, 74] },
  A: { root: 33, pad: [64, 69, 71, 76] },     // Asus2
  Bm: { root: 35, pad: [62, 66, 71, 74] },
  G: { root: 31, pad: [59, 64, 69, 74] },     // G6/9
};
