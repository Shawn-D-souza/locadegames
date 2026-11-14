import { defineSounds } from "../../sound/definition";
import { mallet, scatter, thump, tine, woodTap } from "../../sound/kit";
import { ring } from "../../sound/dsp/modes";
import { contact } from "../../sound/kit/tuned";

/** Takes of a ball hitting a ball: each a little higher, so a break's clatter never sounds stamped out. */
const CLACK_HZ = [3_300, 3_500, 3_700, 3_950] as const;

/**
 * How a solid resin ball rings when struck (owner direction: they sounded like plastic): a few modes far apart, all
 * dying within a few ms, so it's a ping, not a tone. Close modes ringing on (the wood block's) made a hollow toy.
 * Ratios to the take's pitch, levels, time constants (s).
 */
const RESIN_BALL = [
  { ratio: 1, amp: 1, decay: 0.005 },
  { ratio: 1.42, amp: 0.5, decay: 0.0035 },
  { ratio: 2.11, amp: 0.25, decay: 0.0022 },
] as const;

/**
 * A pool table in a quiet room (my calls): the cue's leather tip knocking the cue ball, hard resin balls clicking,
 * rubber cushions, a ball dropping into a pocket and rolling away under the table; a short sting for a foul, and a
 * heavy one for the black going in too early.
 */
export const POOL_SOUNDS = defineSounds({
  poolStrike: {
    about: "The cue strikes the cue ball: a short woody knock with the leather tip's softness. Take = how hard (soft, medium, hard).",
    level: "event",
    room: 0.12,
    variants: 3,
    render(mix, hard) {
      mix.add(woodTap(mix, { hz: 620 + hard * 90, decay: 0.03, hardness: 0.35 + hard * 0.2 }), { gain: 0.6 + hard * 0.2 });
      mix.add(thump(mix, { hz: 140, drop: 1.4, decay: 0.04, drive: 1.2, box: 420 }), { gain: 0.25 + hard * 0.15 });
    },
  },
  poolClack: {
    about: "Two balls hit: the sharp crack of solid resin on resin (a quick ping, never a hollow plastic tone). Louder the harder they hit (the volume it's played at). Takes: a little higher each.",
    level: "event",
    room: 0.1,
    variants: CLACK_HZ.length,
    render(mix, take) {
      const pitch = CLACK_HZ[take]!;
      // The crack of two hard surfaces meeting, the ball's short glassy ping, and a quick low knock for its weight.
      mix.add(contact(mix, 0.0018, 6_000), { gain: 0.7 });
      mix.add(contact(mix, 0.001, 3_000), { gain: 0.3 });
      mix.add(ring(mix, RESIN_BALL.map((m) => ({ hz: pitch * m.ratio, amp: m.amp, decay: m.decay }))), { gain: 0.8 });
      mix.add(ring(mix, [{ hz: pitch * 0.3, amp: 1, decay: 0.003 }]), { gain: 0.45 });
    },
  },
  poolCushion: {
    about: "A ball hits a cushion: a dull, rubbery thud with the rail's wood under it.",
    level: "quiet",
    room: 0.1,
    render(mix) {
      mix.add(thump(mix, { hz: 150, drop: 1.3, decay: 0.05, drive: 1.2, box: 380 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 240, decay: 0.03, hardness: 0.25 }), { gain: 0.45 });
    },
  },
  poolPocket: {
    about: "A ball drops into a pocket: a hollow knock as it falls, then a short rattle as it rolls away under the table.",
    level: "event",
    room: 0.16,
    render(mix) {
      mix.add(woodTap(mix, { hz: 280, decay: 0.05, hardness: 0.45 }), { gain: 0.85 });
      mix.add(thump(mix, { hz: 110, drop: 1.5, decay: 0.06, drive: 1.3, box: 320 }), { gain: 0.45 });
      mix.add(scatter(mix, { pieces: 5, seconds: 0.28, lowHz: 380, highHz: 620, fade: 0.8 }), { at: 0.07, gain: 0.3 });
    },
  },
  poolPotted: {
    about: "One of your balls went in (whoever's shot it was): two bright tines climbing, one closer to the black.",
    level: "event",
    room: 0.2,
    render(mix) {
      mix.add(tine(mix, { note: "D5", ring: 0.14, hardness: 0.45 }), { gain: 0.6 });
      mix.add(tine(mix, { note: "A5", ring: 0.24, hardness: 0.45 }), { at: 0.08, gain: 0.7 });
    },
  },
  poolFoul: {
    about: "A foul (the cue ball in, no ball touched, or someone else's first): two dull knocks falling. The turn passes.",
    level: "event",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 300, decay: 0.03, hardness: 0.25 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 240, decay: 0.035, hardness: 0.2 }), { at: 0.13, gain: 0.7 });
    },
  },
  poolOut: {
    about: "The black went in too early: that player is out. A heavy blow, then three notes falling away.",
    level: "moment",
    room: 0.24,
    render(mix) {
      mix.add(thump(mix, { hz: 100, drop: 1.8, decay: 0.1, drive: 1.6, box: 300 }), { gain: 0.8 });
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.3 }), { at: 0.14, gain: 0.55 });
      mix.add(mallet(mix, { note: "E4", ring: 0.14, hardness: 0.25 }), { at: 0.3, gain: 0.55 });
      mix.add(mallet(mix, { note: "D4", ring: 0.34, hardness: 0.2 }), { at: 0.46, gain: 0.6 });
    },
  },
});
