// The launch video's music: toy-box pop, 120 BPM (one bar = 2 s), D major pentatonic, written to the script.
// Writes public/music.wav and src/cues.json: the exact time of every moment the picture syncs to.
// Run: npm run music (from video/).
import { writeFileSync } from "node:fs";
import * as E from "./engine.mjs";
import { finish, steps, CH } from "./common.mjs";

E.reseed(7);
const BARS = 25, S = E.song(120, BARS * 2 + 3), { at, put, kicks, beat } = S;
const cues = [];
const cue = (name, bar, b = 0) => cues.push({ name, t: +at(bar, b).toFixed(3) });

// chord per bar, the whole film
const PLAN = ["D", "A", "Bm", "G", /*4*/ "D", "A", "Bm", "G", "D", "A", /*10*/ "D", "A", "Bm", "G", "D", "A", "Bm", "G", /*18*/ "D", "A", /*20*/ "D", "A", "Bm", "G", /*24*/ "D"];
const ch = (bar) => CH[PLAN[bar]];

const LEAD = {
  D: [[0, .5, 78], [.5, .5, 81], [1, .75, 83], [1.75, .25, 81], [2, .5, 78], [2.5, .5, 76], [3, 1, 74]],
  A: [[0, .5, 76], [.5, .5, 78], [1, 1, 81], [2, .5, 76], [2.5, .5, 74], [3, 1, 76]],
  Bm: [[0, .5, 74], [.5, .5, 78], [1, .75, 83], [1.75, .25, 81], [2, .5, 78], [2.5, .5, 81], [3, .5, 83], [3.5, .5, 86]],
  G: [[0, 1.5, 83], [1.5, .5, 81], [2, .5, 78], [2.5, .5, 76], [3, 1, 74]],
  G2: [[0, .5, 83], [.5, .5, 86], [1, .5, 88], [1.5, .5, 86], [2, .5, 83], [2.5, .5, 81], [3, .5, 83], [3.5, .5, 81]],
};

// ---------- building blocks ----------
const arp = (bar, { gain = 0.3, upto = 8, hard = 0.5 } = {}) => {
  const p = ch(bar).pad, notes = [p[0], p[1], p[2], p[3], p[2] + 12, p[3], p[2], p[1]];
  notes.forEach((m, k) => { if (k < upto) put("music", E.mallet(m, { hard }), at(bar, k * 0.5), gain, k % 2 ? 0.3 : -0.3, 0.35, 0.15); });
};
const pad = (bar, { gain = 0.2, cut = 1400, a = 0.4, len = 4 } = {}) => put("music", E.supersaw(ch(bar).pad, beat * len, { a, r: 0.5, cut, voices: 5, spread: 14 }), at(bar), gain, 0, 0.45);
const kickAt = (bar, b, g = 0.95, o = {}) => { put("drums", E.kick({ decay: 0.22, tone: 50, ...o }), at(bar, b), g); kicks.push(at(bar, b)); };
const backbeat = (bar, g = 1) => { for (const b of [1, 3]) { put("drums", E.snare(), at(bar, b), 0.45 * g, 0, 0.25); put("drums", E.clap(), at(bar, b), 0.4 * g, 0.1, 0.3); } };
const hats = (bar, g = 1, pat = "xxoxxxoxxxoxxxox") => { for (const [c, b] of steps(pat)) put("drums", E.hat({ decay: c === "o" ? 0.06 : 0.03 }), at(bar, b), (c === "o" ? 0.2 : 0.11) * g, 0.25); };
const bassLine = (bar, g = 0.8, busy = true) => {
  const c = ch(bar); const pat = busy ? [[0, .5, 0], [.75, .25, 0], [1.5, .5, 0], [2, .4, 0], [2.5, .25, 12], [3, .4, 0], [3.5, .4, 12]] : [[0, 1.5, 0], [2, 1.5, 0]];
  for (const [b, l, o] of pat) put("bass", E.bass(c.root + o, l * beat, { bright: 500, env: 1400, sub: 0.65 }), at(bar, b), g);
};
const stabs = (bar, g = 0.14, beatsAt = [0, 0.75, 1.5, 2.5, 3]) => { for (const b of beatsAt) ch(bar).pad.forEach((m, k) => put("music", E.mallet(m, { hard: 0.7, decay: 0.35 }), at(bar, b), g, (k - 1.5) * 0.25, 0.25)); };
const lead = (bar, mel, { g = 0.36, glock = 0 } = {}) => { for (const [b, l, m] of mel) { put("lead", E.tine(m, l * beat, { index: 1.8, bell: 0.4 }), at(bar, b), g, 0.05, 0.3, 0.3); if (glock) put("lead", E.glock(m + 12, { decay: 0.8 }), at(bar, b), glock, -0.15, 0.3, 0.25); } };
const counter = (bar, g = 0.07) => { const p = ch(bar).pad; for (let s = 0; s < 16; s++) put("music", E.mallet([p[0] + 12, p[2], p[1] + 12, p[2]][s % 4], { hard: 0.4, decay: 0.25 }), at(bar, s / 4), g, s % 2 ? 0.5 : -0.5); };
const fullBar = (bar, { second = false, melody = null } = {}) => {
  for (const b of [0, 1.5, 2, bar % 2 ? 3.5 : 2.75]) kickAt(bar, b);
  backbeat(bar); hats(bar); put("drums", E.hat({ open: true }), at(bar, 3.5), 0.12, -0.2);
  bassLine(bar); stabs(bar); pad(bar, { gain: 0.16, cut: 2600, a: 0.05 });
  if (melody !== false) lead(bar, melody || LEAD[PLAN[bar]], { glock: second ? 0.1 : 0 });
  if (second) counter(bar);
};

// ---------- Act 1: hook, bars 0-3 (0:00-0:08). Quiet, so the chat can be read ----------
for (let bar = 0; bar < 4; bar++) {
  arp(bar, { gain: bar === 0 ? 0.22 : 0.28, upto: bar === 3 ? 6 : 8, hard: 0.4 });
  pad(bar, { gain: 0.16, cut: 900 + bar * 250, a: 0.8 });
  if (bar >= 2) for (let s = 0; s < 16; s += 2) if (!(bar === 3 && s >= 12)) put("drums", E.shaker(), at(bar, s / 4), 0.08 + bar * 0.02, 0.35);
}
// chat bubbles (the bubbles' own pops come with the sound effects, later)
[[0, 0], [0, 2], [1, 1], [1, 3], [2, 1.5], [2, 3.5]].forEach(([bar, b], i) => cue(i < 5 ? `bubble${i + 1}` : "inviteCard", bar, b));
put("lead", E.glock(86, { decay: 1 }), at(2, 3.5), 0.16, 0, 0.5, 0.4); // the invite card lands
cue("cameraPush", 3, 0);
put("fx", E.riser(beat * 4, { from: 400, to: 5000, tonal: false, gainCurve: 2.5 }), at(3), 0.12);
put("fx", E.reverse(E.crash({ decay: 0.5 })), at(4) - 0.8, 0.16);

// ---------- Act 2: how it works, bars 4-9 (0:08-0:20) ----------
// bar 4: the code opens into the room; the beat starts
cue("roomOpens", 4, 0);
put("drums", E.crash({ decay: 1.2 }), at(4), 0.22, 0, 0.3);
for (const bar of [4, 5, 6]) {
  for (const b of [0, 2]) kickAt(bar, b, 0.8);
  if (bar >= 5) for (const b of [1, 3]) put("drums", E.clap(), at(bar, b), 0.32, 0.1, 0.35);
  hats(bar, 0.6, "..x...x...x...x.");
  bassLine(bar, 0.6, false);
  arp(bar, { gain: 0.2, hard: 0.5 });
  pad(bar, { gain: 0.15, cut: 1600, a: 0.1 });
}
// bar 5: four phones slide in, one per beat, on the app's own player notes (Ana A4, Ben B4, Mia D5, Leo E5)
[69, 71, 74, 76].forEach((m, k) => {
  cue(`phone${k + 1}`, 5, k);
  put("lead", E.tine(m + 12, beat * 0.9, { index: 1.6, bell: 0.5 }), at(5, k), 0.38, (k - 1.5) * 0.4, 0.35, 0.25);
  put("lead", E.glock(m + 24, { decay: 0.6 }), at(5, k), 0.08, (k - 1.5) * 0.4, 0.3);
});
cue("textOwnPhone", 6, 0);
put("lead", E.tine(86, beat * 2, { index: 1.6 }), at(6), 0.22, 0, 0.5, 0.35);
cue("tapTerritory", 6, 3);
// bar 7: 3, 2, 1, GO on the beats
[[0, "count3", 62], [1, "count2", 66], [2, "count1", 69]].forEach(([b, name, m]) => {
  cue(name, 7, b);
  put("drums", E.tom(m - 12, { decay: 0.2 }), at(7, b), 0.5, 0, 0.3);
  kickAt(7, b, 0.7);
  put("lead", E.mallet(m + 12, { hard: 0.9 }), at(7, b), 0.3, 0, 0.3);
});
cue("go", 7, 3);
kickAt(7, 3, 1);
put("drums", E.crash({ decay: 0.8 }), at(7, 3), 0.25, 0, 0.3);
put("lead", E.tine(86, beat * 0.9, { index: 2.2, bell: 0.6 }), at(7, 3), 0.4, 0, 0.4, 0.3);
put("music", E.supersaw([62, 66, 69, 74], beat, { a: 0.003, r: 0.3, cut: 4000, voices: 5 }), at(7, 3), 0.18, 0, 0.4);
// bar 8: one match, four views. The groove rolls, the hook is teased
cue("matchFourViews", 8, 0);
cue("textNoBots", 8, 2);
for (const b of [0, 1, 2, 3]) kickAt(8, b, 0.85);
backbeat(8, 0.8); hats(8, 0.8); bassLine(8, 0.7); stabs(8, 0.11);
lead(8, LEAD.D.slice(0, 4), { g: 0.28 });
// bar 9: the dive. Snare roll, riser, then half a beat of silence
cue("dive", 9, 0);
for (let k = 0; k < 16; k++) { const b = k < 8 ? k * 0.25 : 2 + (k - 8) * 0.125 * 1.5; if (b >= 3.5) break; put("drums", E.snare({ tone: 190 + k * 10 }), at(9, b), 0.12 + k * 0.028, 0, 0.3); }
for (const b of [0, 1, 2, 3]) kickAt(9, b, 0.7 + b * 0.05);
put("bass", E.bass(33, beat * 3.4, { bright: 300, env: 2000, decay: 1.2 }), at(9), 0.5);
pad(9, { gain: 0.2, cut: 3000, a: 0.02, len: 3.4 });
put("fx", E.riser(beat * 7.4, { from: 300, to: 10000 }), at(8, 0), 0.24, 0, 0.3);
put("fx", E.reverse(E.crash({ decay: 0.6 })), at(10) - 0.95, 0.2);
cue("silence", 9, 3.5);

// ---------- Act 3: the games, bars 10-19 (0:20-0:40), the drop ----------
put("fx", E.impact(), at(10), 0.55);
put("drums", E.crash(), at(10), 0.35, 0, 0.2);
const GAMES = [[10, "poolBreak"], [11, "carrom"], [12, "dotsClash"], [14, "headCrash"], [15, "chess"]];
for (const [bar, name] of GAMES) cue(name, bar, 0);
for (let bar = 10; bar < 18; bar++) {
  const second = bar >= 14;
  fullBar(bar, { second, melody: bar === 17 ? LEAD.G2 : null });
  if (bar === 14 || bar === 11 || bar === 15) put("drums", E.crash({ decay: 0.7 }), at(bar), 0.16, bar % 2 ? 0.4 : -0.4, 0.2);
}
// Dots Clash's chain: a pop on every beat of bars 12-13, climbing (the waves)
for (let k = 0; k < 8; k++) { const bar = 12 + (k >> 2), b = k % 4; cue(`chainWave${k + 1}`, bar, b); put("music", E.glock([74, 76, 78, 81, 83, 86, 88, 90][k], { decay: 0.4 }), at(bar, b), 0.1, (k % 2 ? 0.5 : -0.5), 0.3); }
// bars 16-17: eight flashes, one per beat: a chord stab on every beat marks each cut
const FLASHES = ["memory", "ludo", "snakesLadders", "fourInARow", "seaBattle", "checkers", "dotsBoxes", "ticTacToeToUltimate"];
FLASHES.forEach((name, k) => { const bar = 16 + (k >> 2), b = k % 4; cue(`flash_${name}`, bar, b); put("music", E.supersaw(ch(bar).pad.map((m) => m + 12), beat * 0.3, { a: 0.003, d: 0.1, s: 0.5, r: 0.1, cut: 5000, voices: 5 }), at(bar, b), 0.12, 0, 0.25); });
// bar 18: the full games grid lands. Text: PICK ANY GAME. PLAY TOGETHER.
cue("gamesGrid", 18, 0);
cue("text15Games", 18, 1);
kickAt(18, 0, 1); put("fx", E.impact({ decay: 1.2 }), at(18), 0.4);
put("drums", E.crash({ decay: 1.6 }), at(18), 0.38, 0, 0.3);
put("music", E.supersaw(CH.D.pad, beat * 3.5, { a: 0.005, r: 0.6, cut: 3500, voices: 7, spread: 22 }), at(18), 0.3, 0, 0.5);
put("bass", E.bass(38, beat * 3.5, { bright: 400 }), at(18), 0.8);
lead(18, [[0, 2, 86], [2, .5, 83], [2.5, .5, 81], [3, 1, 78]], { g: 0.34, glock: 0.08 });
// bar 19: a breath, then a roll back in (back to the four phones)
cue("backToPhones", 19, 0);
arp(19, { gain: 0.24, hard: 0.6 });
pad(19, { gain: 0.18, cut: 2000, a: 0.05 });
for (let k = 0; k < 8; k++) put("drums", E.snare({ tone: 200 + k * 14 }), at(19, 2 + k * 0.25), 0.12 + k * 0.04, 0, 0.3);
put("fx", E.riser(beat * 4, { from: 500, to: 9000, tonal: false }), at(19), 0.18);

// ---------- Act 4: payoff, bars 20-24 (0:40-0:50) ----------
cue("territoryWin", 20, 0);
put("fx", E.impact(), at(20), 0.5);
put("drums", E.crash({ decay: 1.6 }), at(20), 0.38, 0, 0.3);
fullBar(20, { second: true });
// bar 21: the champion card. The lead steps back to leave room for the app's trumpets
cue("championCard", 21, 0);
fullBar(21, { second: false, melody: false });
put("music", E.supersaw(CH.A.pad.map((m) => m + 12), beat * 4, { a: 0.3, r: 0.3, cut: 4000, voices: 7, spread: 25 }), at(21), 0.08, 0, 0.4);
// bar 22: PLAY WITH YOUR FRIENDS. -> ANYTIME. -> ANYWHERE.
cue("textPlayWithFriends", 22, 0); cue("textAnytime", 22, 2); cue("textAnywhere", 22, 3);
for (const b of [0, 1.5, 2, 3]) kickAt(22, b);
backbeat(22, 0.8); hats(22, 0.8); bassLine(22); pad(22, { gain: 0.18, cut: 3000, a: 0.05 });
for (const [b, m] of [[0, 78], [2, 81], [3, 83]]) { put("lead", E.tine(m, beat * 0.9, { index: 2 }), at(22, b), 0.38, 0, 0.35, 0.3); put("lead", E.glock(m + 12), at(22, b), 0.1, 0, 0.35); stabs(22, 0.16, [b]); }
// bar 23: the logo builds, one piece per beat (X, O, pawn, die), each with its note, over a held chord
["logoX", "logoO", "logoPawn", "logoDie"].forEach((name, k) => {
  cue(name, 23, k);
  const m = [74, 76, 78, 81][k];
  put("lead", E.tine(m + 12, beat * 0.9, { index: 2, bell: 0.6 }), at(23, k), 0.36, (k - 1.5) * 0.3, 0.4, 0.3);
  put("music", E.mallet(m, { hard: 0.9 }), at(23, k), 0.22, (k - 1.5) * 0.3, 0.3);
  kickAt(23, k, 0.55 + k * 0.1, { decay: 0.18 });
});
put("music", E.supersaw(CH.G.pad, beat * 4, { a: 0.2, r: 0.2, cut: 2500, voices: 7, spread: 20 }), at(23), 0.2, 0, 0.5);
put("bass", E.bass(31, beat * 3.8, { bright: 350 }), at(23), 0.6);
put("fx", E.riser(beat * 4, { from: 800, to: 8000, tonal: false, gainCurve: 3 }), at(23), 0.12);
// bar 24: LOCADE GAMES, the address. Final chord rings out to the end card
cue("logoName", 24, 0);
cue("end", 25, 1);
kickAt(24, 0, 1, { decay: 0.4 });
put("drums", E.crash({ decay: 2.2 }), at(24), 0.42, 0, 0.4);
put("bass", E.bass(38, beat * 5, { bright: 350, rel: 1.2 }), at(24), 0.8);
CH.D.pad.forEach((m, k) => put("music", E.mallet(m, { hard: 0.8 }), at(24), 0.2, (k - 1.5) * 0.3, 0.5));
put("music", E.supersaw(CH.D.pad, beat * 4, { a: 0.01, r: 2.5, cut: 3200, voices: 7, spread: 22 }), at(24), 0.22, 0, 0.7);
put("lead", E.tine(86, beat * 4, { index: 2, rel: 1.5 }), at(24), 0.4, 0, 0.6, 0.3);
put("lead", E.glock(98, { decay: 2 }), at(24), 0.14, 0, 0.6);
put("lead", E.glock(93, { decay: 2 }), at(24, 0.5), 0.08, 0.3, 0.6);

finish(S, "launch-toybox", { out: new URL("../public/music.wav", import.meta.url).pathname, trimDb: -2.2, gains: { drums: 0.6, bass: 0.7, music: 1.2, lead: 1.6 } });
cues.sort((a, b) => a.t - b.t);
writeFileSync(new URL("../src/cues.json", import.meta.url).pathname, JSON.stringify({ bpm: 120, beat, bar: beat * 4, seconds: S.seconds, cues }, null, 1) + "\n");
console.log(cues.length, "cues");
