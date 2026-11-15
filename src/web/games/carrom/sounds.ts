import { defineSounds } from "../../sound/definition";
import { mallet, swish, thump, tine, woodTap } from "../../sound/kit";
import { contact } from "../../sound/kit/tuned";

/** Takes of a coin hitting a coin: each a little higher, so a break's clatter never sounds stamped out. */
const CLACK_HZ = [1_850, 1_980, 2_120, 2_260] as const;

/**
 * A carrom board in a quiet room (my calls): a fingernail flicking the striker, flat wooden coins clicking on a powdered
 * board, the solid frame, a coin dropping into a net pocket; bright notes for your points and the queen, a flourish when
 * she's covered, two falling notes when she goes back, two dull knocks for a foul.
 */
export const CARROM_SOUNDS = defineSounds({
  carromFlick: {
    about: "A fingernail flicks the striker: a sharp snap and the disc's short knock. Take = how hard (soft, medium, hard).",
    level: "event",
    room: 0.1,
    variants: 3,
    render(mix, hard) {
      mix.add(contact(mix, 0.0015, 3_800), { gain: 0.55 + hard * 0.15 });
      mix.add(woodTap(mix, { hz: 1_150 + hard * 120, decay: 0.014, hardness: 0.6 + hard * 0.15 }), { gain: 0.7 });
      mix.add(thump(mix, { hz: 170, drop: 1.3, decay: 0.03, drive: 1.1, box: 520 }), { gain: 0.18 + hard * 0.1 });
    },
  },
  carromClack: {
    about: "Two discs hit: the short dry click of flat wooden coins (louder the harder they hit: the volume it's played at). Takes: a little higher each.",
    level: "event",
    room: 0.1,
    variants: CLACK_HZ.length,
    render(mix, take) {
      mix.add(contact(mix, 0.0012, 4_200), { gain: 0.45 });
      mix.add(woodTap(mix, { hz: CLACK_HZ[take]!, decay: 0.011, hardness: 0.75 }), { gain: 0.85 });
    },
  },
  carromWall: {
    about: "A disc hits the frame: a solid, dull knock of thick wood.",
    level: "quiet",
    room: 0.1,
    render(mix) {
      mix.add(thump(mix, { hz: 165, drop: 1.3, decay: 0.045, drive: 1.2, box: 420 }), { gain: 0.75 });
      mix.add(woodTap(mix, { hz: 360, decay: 0.025, hardness: 0.4 }), { gain: 0.5 });
    },
  },
  carromPocket: {
    about: "A coin (or the striker) drops into a pocket: a soft knock as it falls, and the net taking it with a hush.",
    level: "event",
    room: 0.14,
    render(mix) {
      mix.add(woodTap(mix, { hz: 300, decay: 0.04, hardness: 0.35 }), { gain: 0.8 });
      mix.add(thump(mix, { hz: 120, drop: 1.5, decay: 0.05, drive: 1.2, box: 340 }), { gain: 0.4 });
      mix.add(swish(mix, { seconds: 0.16, fromHz: 1_400, toHz: 700, grain: 0.5 }), { at: 0.03, gain: 0.35 });
    },
  },
  carromScored: {
    about: "Your coin went in: points for you. Two bright tines climbing.",
    level: "event",
    room: 0.2,
    render(mix) {
      mix.add(tine(mix, { note: "E5", ring: 0.14, hardness: 0.45 }), { gain: 0.6 });
      mix.add(tine(mix, { note: "B5", ring: 0.24, hardness: 0.45 }), { at: 0.08, gain: 0.7 });
    },
  },
  carromQueen: {
    about: "The queen went in: three quick notes rising. She still has to be covered.",
    level: "event",
    room: 0.22,
    render(mix) {
      mix.add(mallet(mix, { note: "D5", ring: 0.12, hardness: 0.45 }), { gain: 0.55 });
      mix.add(mallet(mix, { note: "F#5", ring: 0.12, hardness: 0.45 }), { at: 0.09, gain: 0.6 });
      mix.add(mallet(mix, { note: "A5", ring: 0.3, hardness: 0.45 }), { at: 0.18, gain: 0.7 });
    },
  },
  carromCovered: {
    about: "The queen is covered: her 50 points count. A climbing flourish that lands on a ringing chord.",
    level: "moment",
    room: 0.26,
    render(mix) {
      mix.add(mallet(mix, { note: "D5", ring: 0.1, hardness: 0.5 }), { gain: 0.5 });
      mix.add(mallet(mix, { note: "F#5", ring: 0.1, hardness: 0.5 }), { at: 0.07, gain: 0.5 });
      mix.add(mallet(mix, { note: "A5", ring: 0.1, hardness: 0.5 }), { at: 0.14, gain: 0.55 });
      mix.add(tine(mix, { note: "D6", ring: 0.5, hardness: 0.4 }), { at: 0.21, gain: 0.6 });
      mix.add(mallet(mix, { note: "A5", ring: 0.5, hardness: 0.3 }), { at: 0.21, gain: 0.4 });
    },
  },
  carromQueenBack: {
    about: "The queen wasn't covered (or went in on a foul): she goes back in the middle. Two notes falling.",
    level: "event",
    room: 0.2,
    render(mix) {
      mix.add(mallet(mix, { note: "A4", ring: 0.14, hardness: 0.3 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "E4", ring: 0.3, hardness: 0.25 }), { at: 0.15, gain: 0.6 });
    },
  },
  carromFoul: {
    about: "A foul: the striker went in (-10). Two dull knocks falling; the turn passes.",
    level: "event",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 300, decay: 0.03, hardness: 0.25 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 240, decay: 0.035, hardness: 0.2 }), { at: 0.13, gain: 0.7 });
    },
  },
});
