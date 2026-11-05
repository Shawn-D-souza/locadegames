import { durations } from "../../../theme";
import { defineSounds } from "../definition";
import { lowpass } from "../dsp/filters";
import { addSparkle, mallet, pop, reed, stamp, thump, tine, trumpet, woodTap } from "../kit";
import type { Mix } from "../mix";
import { scaleStep, type ScaleNote } from "../pitch";

/** Seconds, from the theme's motion tokens. */
const sec = (ms: number) => ms / 1000;
const LINE_SECONDS = sec(durations.lineDraw);
/** Spring easing passes its end point at about this share of its length: when a popping or stamping thing "lands". */
const SPRING_LANDS = 0.34;
const STAMP_LANDS = sec(durations.celebrate) * SPRING_LANDS;

/** The count's climb: from A5 up the scale, staying below where tines turn piercing. */
export const POINT_TICK_TAKES = 9;
const POINT_TICK_FIRST_STEP = 8;

/** The line slashing through the row: one quick scoop up into a soft note, on the same instruments as the marks. */
function lineSlash(mix: Mix) {
  mix.add(pop(mix, { note: "D5", from: 0.66, glide: 0.035, decay: 0.08 }), { gain: 0.8 });
  mix.add(mallet(mix, { note: "D5", ring: 0.12, hardness: 0.3 }), { at: 0.07, gain: 0.7 });
}

/** Quick notes climbing to a long one that lands with the tag, played into a room: the echo is what makes it a call. */
function trumpetCall(mix: Mix, climb: readonly ScaleNote[], top: ScaleNote, { pan = 0, gain = 1, late = 0, held = 0.4 }: { pan?: number; gain?: number; late?: number; held?: number } = {}) {
  climb.forEach((note, i) => {
    const part = trumpet(mix, { note, seconds: 0.045, release: 0.02 });
    mix.add(part, { at: late + (STAMP_LANDS / climb.length) * i, gain: gain * (0.72 + (0.14 * i) / climb.length), pan });
  });
  const long = trumpet(mix, { note: top, seconds: held, swell: 0.7 });
  mix.add(long, { at: late + STAMP_LANDS, gain, pan });
  mix.add(long, { at: late + STAMP_LANDS + 0.12, gain: gain * 0.16, pan: pan - 0.4 });
  mix.add(long, { at: late + STAMP_LANDS + 0.24, gain: gain * 0.07, pan: pan + 0.4 });
}

/** Three trumpets in harmony, climbing to held high notes as the tag lands: the winner's sound. */
function threeTrumpets(mix: Mix, held = 0.4) {
  trumpetCall(mix, ["D5", "A5"], "D6", { held });
  trumpetCall(mix, ["A4", "F#5"], "A5", { held, pan: -0.35, gain: 0.62, late: 0.006 });
  trumpetCall(mix, ["F#4", "D5"], "F#5", { held, pan: 0.35, gain: 0.55, late: 0.01 });
}

/** The trumpet with its brightness taken away, as if from far off. */
const farTrumpet = (mix: Mix, note: ScaleNote, seconds: number) => lowpass(trumpet(mix, { note, seconds, release: 0.16 }), mix.sampleRate, 1_500);

/**
 * How matches and games end, the same in every game. Each is keyed to the animation it goes with
 * (DESIGN.md, Match screen), and its timing comes from the same motion tokens.
 */
export const ENDING_SOUNDS = defineSounds({
  boardThump: {
    about: "The last move lands and the board gives its small thump, then silence for a moment (the freeze) so the result sinks in.",
    level: "event",
    room: 0.16,
    render(mix) {
      mix.add(thump(mix, { hz: 100, decay: 0.075, box: 300 }));
      mix.add(woodTap(mix, { hz: 520, decay: 0.022, hardness: 0.5 }), { gain: 0.3 });
    },
  },
  winLineDrawn: {
    about: "The win line slashes through the winning row: one quick scoop up into a soft note.",
    level: "event",
    room: 0.2,
    render(mix) {
      lineSlash(mix);
    },
  },
  winLineDrawnWithSparks: {
    about: "The same stroke on the winner's phone, with tiny sparks along the line, leading straight into the fanfare.",
    level: "event",
    room: 0.24,
    render(mix) {
      lineSlash(mix);
      addSparkle(mix, { notes: ["A6", "B6", "D7"], count: 5, from: LINE_SECONDS * 0.2, to: LINE_SECONDS, gain: 0.14 });
    },
  },
  matchWinFanfare: {
    about: "You won (the result tag stamps on): three trumpets in harmony, climbing to a long high chord as the tag lands. It plays on every win, so it stays short.",
    level: "celebration",
    room: 0.18,
    render(mix) {
      threeTrumpets(mix);
    },
  },
  matchLossSting: {
    about: "You lost (a quiet tag slides up, your piece droops and tips over): the winner's trumpet again, now alone and far away, two slow falling notes and the small tok of the piece tipping. Sympathy, no mocking.",
    level: "event",
    room: 0.26,
    render(mix) {
      mix.add(farTrumpet(mix, "A4", 0.15), { gain: 0.85 });
      mix.add(farTrumpet(mix, "F#4", 0.36), { at: 0.26 });
      mix.add(woodTap(mix, { hz: 340, decay: 0.022, hardness: 0.2 }), { at: 0.26, gain: 0.2 });
    },
  },
  matchDrawShrug: {
    about: "A draw (the DRAW! tag stamps on, both pieces shrug twice): a small stamp, then two open notes that don't resolve. Neither good nor bad.",
    level: "event",
    room: 0.26,
    render(mix) {
      mix.add(stamp(mix, { weight: 0.45 }), { gain: 0.65 });
      mix.add(mallet(mix, { note: "A4", ring: 0.1, hardness: 0.4 }), { gain: 0.5 });
      mix.add(mallet(mix, { note: "E5", ring: 0.12, hardness: 0.42 }), { at: 0.15, gain: 0.85 });
      mix.add(mallet(mix, { note: "E5", ring: 0.09, hardness: 0.35 }), { at: 0.39, gain: 0.55 });
      mix.add(mallet(mix, { note: "A5", ring: 0.2, hardness: 0.38 }), { at: 0.39, gain: 0.72 });
    },
  },
  boardShakeRattle: {
    about: "A drawn board shaking side to side: four small rattles, on the shake's four swings.",
    level: "quiet",
    room: 0.12,
    render(mix) {
      const swing = sec(durations.celebrate) * 0.2;
      [0.9, 0.75, 0.55, 0.4].forEach((gain, i) => {
        mix.add(woodTap(mix, { hz: 395 + (i % 2) * 42, decay: 0.022, hardness: 0.35 }), { at: swing * (i + 1), gain });
      });
    },
  },
  matchWatchedResult: {
    about: "A match you were watching ends (ANA WINS!): the tag stamps on with one friendly chord. Not your win, so no party.",
    level: "event",
    room: 0.26,
    render(mix) {
      mix.add(stamp(mix, { weight: 0.5 }), { at: STAMP_LANDS, gain: 0.7 });
      mix.add(mallet(mix, { note: "D5", ring: 0.2, hardness: 0.45 }), { at: STAMP_LANDS, gain: 0.72 });
      mix.add(mallet(mix, { note: "A5", ring: 0.22, hardness: 0.45 }), { at: STAMP_LANDS, gain: 0.72 });
    },
  },
  pointsTick: {
    about: "A number on the result tag ticking up (+1, +2, or a land share counting). Take 0 → 8 climbs the scale with the count.",
    level: "quiet",
    room: 0.12,
    variants: POINT_TICK_TAKES,
    cooldownMs: 42,
    render(mix, step) {
      mix.add(tine(mix, { note: scaleStep(step + POINT_TICK_FIRST_STEP), ring: 0.05, hardness: 0.55 }));
      mix.add(woodTap(mix, { hz: 1_050, decay: 0.006, hardness: 0.6 }), { gain: 0.3 });
    },
  },
  championFanfare: {
    about: "You're the champion: the winner's three trumpets, held much longer, on the app's biggest stamp and a warm chord. The biggest sound in the app. Plays as the results' card starts to pop in.",
    level: "celebration",
    room: 0.36,
    render(mix) {
      threeTrumpets(mix, 1);
      mix.add(stamp(mix, { weight: 1 }), { at: STAMP_LANDS, gain: 0.75 });
      mix.add(thump(mix, { hz: 82, decay: 0.15, box: 250 }), { at: STAMP_LANDS, gain: 0.5 });
      mix.add(reed(mix, { notes: ["D4", "A4", "D5"], seconds: 1, attack: 0.14, release: 0.6 }), { at: STAMP_LANDS, gain: 0.3 });
    },
  },
  championFanfareShared: {
    about: "You share the title: the same trumpets, a little lighter, because two people are holding the trophy.",
    level: "celebration",
    room: 0.36,
    render(mix) {
      threeTrumpets(mix, 0.8);
      mix.add(stamp(mix, { weight: 0.8 }), { at: STAMP_LANDS, gain: 0.7 });
      mix.add(reed(mix, { notes: ["D4", "A4", "D5"], seconds: 0.8, attack: 0.14, release: 0.6 }), { at: STAMP_LANDS, gain: 0.26 });
    },
  },
  championAnnounced: {
    about: "Someone else is the champion: a warm, clapping-along chord. Glad for them, smaller than your own would be.",
    level: "moment",
    room: 0.34,
    render(mix) {
      const lands = sec(durations.celebrate) * SPRING_LANDS;
      mix.add(stamp(mix, { weight: 0.6 }), { at: lands, gain: 0.7 });
      mix.add(mallet(mix, { note: "D5", ring: 0.3, hardness: 0.45 }), { at: lands, gain: 0.72 });
      mix.add(mallet(mix, { note: "A5", ring: 0.3, hardness: 0.45 }), { at: lands + 0.012, gain: 0.66 });
      mix.add(mallet(mix, { note: "D6", ring: 0.42, hardness: 0.5 }), { at: lands + 0.12, gain: 0.72 });
      mix.add(reed(mix, { notes: ["D4", "A4", "F#5"], seconds: 0.5, attack: 0.12, release: 0.7 }), { at: lands, gain: 0.3 });
    },
  },
});
