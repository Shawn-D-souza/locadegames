import { defineSounds } from "../definition";
import { lipPress, mallet, paperTick, pop, tine, woodTap } from "../kit";

/** Buttons, switches, popups, fields, notices: quick, dry and close to the finger, heard all day. */
export const INTERFACE_SOUNDS = defineSounds({
  mainButtonPress: {
    about: "A coral main button pressed (CREATE ROOM, PLAY AGAIN!). The screen's one loud action: the press onto the lip, with a warm second note in it.",
    level: "tap",
    room: 0.1,
    variants: 3,
    render(mix, take) {
      mix.add(lipPress(mix, { note: "A4", weight: 1 - take * 0.06 }));
      mix.add(mallet(mix, { note: "D5", ring: 0.07, hardness: 0.35 }), { at: 0.004, gain: 0.55 });
    },
  },
  secondButtonPress: {
    about: "An ink button pressed (JOIN ROOM, BACK TO ROOM, CLOSE). The same press, plain and a little lower.",
    level: "tap",
    room: 0.06,
    variants: 3,
    render(mix, take) {
      mix.add(lipPress(mix, { note: "F#4", weight: 0.9 - take * 0.06 }));
    },
  },
  iconButtonPress: {
    about: "A small square icon button pressed (settings, copy, share, QR, ✕): a small round pop with a soft note in it.",
    level: "tap",
    room: 0.05,
    variants: 3,
    render(mix, take) {
      mix.add(pop(mix, { note: "D5", from: 0.8 - take * 0.01, glide: 0.01, decay: 0.022 }), { gain: 0.7 });
      mix.add(mallet(mix, { note: "D5", ring: 0.035, hardness: 0.25 }), { at: 0.003, gain: 0.7 });
    },
  },
  backButtonPress: {
    about: "The back arrow pressed: the icon's note and a lower one after it, stepping down, because you're going back.",
    level: "tap",
    room: 0.05,
    render(mix) {
      mix.add(lipPress(mix, { note: "D5", weight: 0.4 }));
      mix.add(mallet(mix, { note: "A4", ring: 0.05, hardness: 0.3 }), { at: 0.05, gain: 0.8 });
    },
  },
  cardPress: {
    about: "A wide card pressed (a game tile for the host, a live match to watch): a broader, softer press, with a touch of card.",
    level: "tap",
    room: 0.08,
    variants: 3,
    render(mix, take) {
      mix.add(lipPress(mix, { note: "A4", weight: 0.8 - take * 0.06 }));
      mix.add(paperTick(mix, { hz: 2_100, decay: 0.004 }), { gain: 0.18 });
    },
  },
  fieldTap: {
    about: "Tapping a field to type in it: a tiny pop.",
    level: "quiet",
    room: 0.04,
    render(mix) {
      mix.add(pop(mix, { note: "A5", from: 0.82, glide: 0.008, decay: 0.016 }));
    },
  },
  roomCodeComplete: {
    about: "The sixth digit of a room code typed: it's complete and JOIN ROOM wakes up. One small touch, barely there.",
    level: "faint",
    room: 0.1,
    render(mix) {
      mix.add(woodTap(mix, { hz: 700, decay: 0.012, hardness: 0.4 }), { gain: 0.7 });
      mix.add(mallet(mix, { note: "A5", ring: 0.05, hardness: 0.25 }), { at: 0.004 });
    },
  },
  popupClose: {
    about: "A popup going away (CLOSE, KEEP PLAYING, tapping outside it): the opening's pop backwards, smaller and sinking.",
    level: "tap",
    room: 0.1,
    render(mix) {
      mix.add(pop(mix, { note: "F#4", from: 1.3, glide: 0.018, decay: 0.05 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.05, hardness: 0.2 }), { at: 0.01, gain: 0.8 });
    },
  },
  warningPopupOpen: {
    about: "A popup that needs a real answer (Quit this game? Leave the room?): the spring, with two low knocks. Serious, not scary.",
    level: "tap",
    room: 0.2,
    render(mix) {
      mix.add(pop(mix, { note: "B4", from: 0.7, glide: 0.014, decay: 0.036 }), { gain: 0.65 });
      mix.add(mallet(mix, { note: "B4", ring: 0.075, hardness: 0.4 }), { at: 0.006 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.105, hardness: 0.35 }), { at: 0.125, gain: 1 });
    },
  },
  switchOn: {
    about: "A switch turned on: two tiny pops, the knob leaving and seating, stepping up.",
    level: "tap",
    room: 0.05,
    render(mix) {
      mix.add(pop(mix, { note: "A4", from: 0.85, glide: 0.006, decay: 0.012 }), { gain: 0.5 });
      mix.add(pop(mix, { note: "D5", from: 0.85, glide: 0.006, decay: 0.02 }), { at: 0.022 });
    },
  },
  switchOff: {
    about: "A switch turned off: the same two tiny pops, stepping down.",
    level: "tap",
    room: 0.05,
    render(mix) {
      mix.add(pop(mix, { note: "A4", from: 0.85, glide: 0.006, decay: 0.012 }), { gain: 0.5 });
      mix.add(pop(mix, { note: "F#4", from: 0.85, glide: 0.006, decay: 0.02 }), { at: 0.022 });
    },
  },
  volumeStep: {
    about: "The volume slider moving a step: one tiny pop, always the same note, so all that changes as you drag is how loud it is.",
    level: "tap",
    room: 0.03,
    // A fast drag passes many steps: ticks, not a buzz.
    cooldownMs: 55,
    render(mix) {
      mix.add(pop(mix, { note: "D5", from: 0.85, glide: 0.006, decay: 0.014 }));
    },
  },
  copied: {
    about: "The room code or link copied (the icon turns into a tick): a pop with a soft note.",
    level: "tap",
    room: 0.18,
    render(mix) {
      mix.add(pop(mix, { note: "A4", from: 0.7, glide: 0.012, decay: 0.026 }), { gain: 0.6 });
      mix.add(mallet(mix, { note: "A5", ring: 0.08, hardness: 0.25 }), { at: 0.008 });
    },
  },
  actionRefused: {
    about: "A short notice saying no (Not your turn yet!, the yellow pill): two low soft bumps. Never a buzzer.",
    level: "tap",
    room: 0.1,
    render(mix) {
      mix.add(mallet(mix, { note: "F#4", ring: 0.038, hardness: 0.35 }));
      mix.add(mallet(mix, { note: "F#4", ring: 0.05, hardness: 0.3 }), { at: 0.095 });
    },
  },
  connectionDropped: {
    about: "The connection dropped (RECONNECTING... shows): a soft step down. Phones do this a lot, so it barely speaks.",
    level: "quiet",
    room: 0.2,
    render(mix) {
      mix.add(tine(mix, { note: "F#5", ring: 0.06, hardness: 0.2 }));
      mix.add(tine(mix, { note: "D5", ring: 0.11, hardness: 0.2 }), { at: 0.09 });
    },
  },
  connectionRestored: {
    about: "Back online after RECONNECTING...: the same step, going up.",
    level: "quiet",
    room: 0.2,
    render(mix) {
      mix.add(tine(mix, { note: "D5", ring: 0.06, hardness: 0.2 }));
      mix.add(tine(mix, { note: "A5", ring: 0.11, hardness: 0.2 }), { at: 0.09 });
    },
  },
  errorScreen: {
    about: "The OOPS!! card pops up: the card, then a gentle uh-oh (a falling minor third).",
    level: "event",
    room: 0.22,
    render(mix) {
      mix.add(pop(mix, { note: "B4", decay: 0.036 }), { gain: 0.45 });
      mix.add(mallet(mix, { note: "A4", ring: 0.1, hardness: 0.4 }), { at: 0.01 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.21, hardness: 0.3 }), { at: 0.19 });
    },
  },
  serversFullScreen: {
    about: "The SERVERS FULL! card with its sleepy Zzz: a slow, yawning walk down.",
    level: "event",
    room: 0.3,
    render(mix) {
      mix.add(pop(mix, { note: "A4", decay: 0.036 }), { gain: 0.35 });
      mix.add(mallet(mix, { note: "D5", ring: 0.2, hardness: 0.2 }), { at: 0.01 });
      mix.add(mallet(mix, { note: "A4", ring: 0.22, hardness: 0.15 }), { at: 0.29, gain: 0.85 });
      mix.add(mallet(mix, { note: "F#4", ring: 0.26, hardness: 0.12 }), { at: 0.62, gain: 0.72 });
      mix.add(mallet(mix, { note: "D4", ring: 0.36, hardness: 0.1 }), { at: 1.02, gain: 0.62 });
    },
  },
});
