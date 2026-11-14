import { SNAKESLADDERS_CONFIG } from "../../../shared/games/snakesladders/config";
import { defineSounds } from "../../sound/definition";
import { bubble, mallet, thump, tine, woodTap } from "../../sound/kit";
import { DIE_HITS } from "./dieMotion";
import { ARRIVE } from "./geometry";
import { hz, PLAYER_NOTES, scaleStep, type ScaleNote } from "../../sound/pitch";

/** The die's clack: a small, hard wooden toy die (owner's pick 2026-11-14, of three on a preview page). Untuned and quickly damped, so it never rings like glass. */
const DIE_CLACK = { hz: 1_150, decay: 0.012, hardness: 0.75 } as const;
/** How loud the board is under each clack. */
const DIE_BOARD = 0.5;
/** How much softer each landing (`DIE_HITS`) is than the one before: only softer, never a different sound. */
const HIT_FADE = 0.1;
/** The throw's first landing is a corner, then the face: the second this long after (s), this hard. */
const FLAT = { after: 0.011, force: 0.55 } as const;
/** Each clack is a hair higher or lower (a share), as a die lands on different faces. */
const CLACK_SPREAD = 0.04;
/** After the last landing it rocks to rest: two tiny clacks this long after it (s), this hard. */
const ROCKS: readonly { after: number; force: number }[] = [
  { after: 0.045, force: 0.25 },
  { after: 0.075, force: 0.13 },
];

/** The hollow board under a pawn landing (its pitch). */
const BOARD_HZ = 230;
/** A pawn's hop: the first square's note, as a step up the scale from D4 (D5); each square after a step higher. */
const FIRST_HOP_NOTE = 5;

/** Hops climb the scale square by square, from here: a long count runs up. */
const FIRST_HOP_STEP = 3;
/** Steps in one octave of the pentatonic scale. */
const OCTAVE_STEPS = 5;
/** The ladder's rungs: a quick run up, two octaves of the scale in steps of two. */
const LADDER_RUNGS = 6;
/** The snake: the same, down, slower. */
const SNAKE_STEPS = 6;

/** Where a note sits on the scale (`scaleStep` backwards). */
function stepOf(note: ScaleNote): number {
  let step = 0;
  while (scaleStep(step) !== note) step++;
  return step;
}

/** A wooden board game on a desk: a wooden die tumbling, a wooden pawn tapping up the scale, a ladder's run up, a snake's slide down. */
export const SNAKESLADDERS_SOUNDS = defineSounds({
  snakesLaddersDieRoll: {
    about:
      "The die is rolled (anyone's roll): a small wooden toy die tumbling on the same hollow board the pawns hop on (owner's pick 2026-11-14: like a real die, matching the game; not glassy, not a drum, not thin, not real physics). A crisp wooden clack with the board under it on every landing you see (`DIE_HITS`: the throw's corner and face, then each tumble over an edge), the same clack each time, only softer, then rocking to rest. Takes differ a little, as real rolls do.",
    level: "event",
    room: 0.1,
    variants: 3,
    render(mix) {
      const clack = (force: number, at: number) => {
        mix.add(woodTap(mix, { ...DIE_CLACK, hz: DIE_CLACK.hz * (1 + mix.between(-CLACK_SPREAD, CLACK_SPREAD)) }), { at, gain: force });
        mix.add(woodTap(mix, { hz: BOARD_HZ, decay: 0.05, hardness: 0.2 }), { at, gain: force * DIE_BOARD });
      };
      const seconds = SNAKESLADDERS_CONFIG.dieMs / 1000;
      DIE_HITS.forEach(({ at }, hit) => clack(1 - HIT_FADE * hit, at * seconds));
      clack(FLAT.force, FLAT.after);
      const rest = DIE_HITS.at(-1)!.at * seconds;
      ROCKS.forEach(({ after, force }) => clack(force, rest + after));
    },
  },
  snakesLaddersHop: {
    about:
      "A pawn lands on the next square (owner direction: wooden, like the die): a wooden knock tuned a step up the scale each square, with the hollow board soft under it. Take = which hop of the roll.",
    level: "quiet",
    room: 0.1,
    variants: 6,
    render(mix, hop) {
      mix.add(woodTap(mix, { hz: hz(scaleStep(FIRST_HOP_NOTE + hop)), decay: 0.04, hardness: 0.4 }));
      mix.add(woodTap(mix, { hz: BOARD_HZ, decay: 0.055, hardness: 0.2 }), { gain: 0.4 });
    },
  },
  snakesLaddersSix: {
    about: "The die lands on a 6: roll again! Two bright tines, the second higher.",
    level: "event",
    room: 0.16,
    render(mix) {
      mix.add(tine(mix, { note: "A5", ring: 0.14, hardness: 0.5 }), { gain: 0.7 });
      mix.add(tine(mix, { note: "D6", ring: 0.2, hardness: 0.5 }), { at: 0.09, gain: 0.8 });
    },
  },
  snakesLaddersLadder: {
    about: "A piece climbs a ladder: a quick run of mallets up the scale, one per rung, ending high. Good news climbs.",
    level: "event",
    room: 0.2,
    render(mix) {
      const climb = SNAKESLADDERS_CONFIG.climbMs / 1000;
      for (let rung = 0; rung < LADDER_RUNGS; rung++) {
        const note = scaleStep(FIRST_HOP_STEP + rung * 2);
        const at = (climb * (1 - ARRIVE) * rung) / (LADDER_RUNGS - 1);
        mix.add(mallet(mix, { note, ring: rung === LADDER_RUNGS - 1 ? 0.3 : 0.1, hardness: 0.45 }), { at, gain: 0.55 + rung * 0.06 });
      }
      mix.add(tine(mix, { note: scaleStep(FIRST_HOP_STEP + (LADDER_RUNGS - 1) * 2 + OCTAVE_STEPS), ring: 0.18 }), { at: climb * (1 - ARRIVE), gain: 0.25 });
    },
  },
  snakesLaddersSnake: {
    about: "A piece slides down a snake: soft mallets falling down the scale, gathering speed, then a low bubbly plop at the tail. Bad news falls.",
    level: "event",
    room: 0.22,
    render(mix) {
      const slide = SNAKESLADDERS_CONFIG.slideMs / 1000;
      const top = FIRST_HOP_STEP + OCTAVE_STEPS + 2;
      for (let step = 0; step < SNAKE_STEPS; step++) {
        // Easing in, like the piece: the notes come quicker as it goes.
        const at = slide * (1 - ARRIVE) * (step / SNAKE_STEPS) ** 0.6;
        mix.add(mallet(mix, { note: scaleStep(top - step * 2), ring: 0.12, hardness: 0.3 }), { at, gain: 0.6 - step * 0.04 });
      }
      mix.add(thump(mix, { hz: 100, drop: 1.6, decay: 0.08, drive: 1.5, box: 260 }), { at: slide * (1 - ARRIVE), gain: 0.7 });
      mix.add(bubble(mix, { note: "D4", size: 1.3 }), { at: slide * (1 - ARRIVE), gain: 0.55 });
    },
  },
  snakesLaddersStuck: {
    about: "A roll too big to finish: the piece stays and shakes. Two dull, low knocks: not this time.",
    level: "event",
    room: 0.12,
    render(mix) {
      mix.add(woodTap(mix, { hz: 300, decay: 0.03, hardness: 0.25 }), { gain: 0.8 });
      mix.add(woodTap(mix, { hz: 250, decay: 0.035, hardness: 0.2 }), { at: 0.13, gain: 0.7 });
    },
  },
  snakesLaddersThreeSixes: {
    about: "A third 6 in a row: the turn is cancelled and the piece flies back where it began. A heavy blow, then two notes falling away.",
    level: "event",
    room: 0.22,
    render(mix) {
      mix.add(thump(mix, { hz: 110, drop: 1.8, decay: 0.09, drive: 1.6, box: 300 }), { gain: 0.75 });
      mix.add(mallet(mix, { note: "A4", ring: 0.12, hardness: 0.3 }), { at: 0.12, gain: 0.55 });
      mix.add(mallet(mix, { note: "E4", ring: 0.26, hardness: 0.2 }), { at: 0.3, gain: 0.6 });
    },
  },
  snakesLaddersHome: {
    about: "A player reaches the last square (anyone; quieter for others): a quick run of mallets up to their own note and a ring above it. Take = the player's color.",
    level: "moment",
    room: 0.28,
    variants: PLAYER_NOTES.length,
    render(mix, player) {
      const top = stepOf(PLAYER_NOTES[player]!);
      [-4, -2, 0].forEach((offset, i) => {
        mix.add(mallet(mix, { note: scaleStep(top + offset), ring: i === 2 ? 0.4 : 0.12, hardness: 0.5 }), { at: i * 0.08, gain: 0.6 + i * 0.12 });
      });
      mix.add(tine(mix, { note: scaleStep(top + OCTAVE_STEPS), ring: 0.35, hardness: 0.4 }), { at: 0.16, gain: 0.35 });
    },
  },
});
