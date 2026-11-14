import { DICE_CONFIG } from "../../../shared/games/dice";
import { defineSounds } from "../../sound/definition";
import { tine, woodTap } from "../../sound/kit";
import { DIE_HITS } from "./dieMotion";

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

/** The hollow board under the die and under a pawn landing (its pitch), shared by the games' hops. */
export const DICE_BOARD_HZ = 230;

/** The shared die (Snakes & Ladders, Ludo): a wooden toy die tumbling on a hollow board, and a 6. In each rolling game's sounds (`GAME_SOUNDS`). */
export const DICE_SOUNDS = defineSounds({
  dieRoll: {
    about:
      "The die is rolled (anyone's roll): a small wooden toy die tumbling on the same hollow board the pawns hop on (Snakes & Ladders, Ludo) (owner's pick 2026-11-14: like a real die, matching the game; not glassy, not a drum, not thin, not real physics). A crisp wooden clack with the board under it on every landing you see (`DIE_HITS`: the throw's corner and face, then each tumble over an edge), the same clack each time, only softer, then rocking to rest. Takes differ a little, as real rolls do.",
    level: "event",
    room: 0.1,
    variants: 3,
    render(mix) {
      const clack = (force: number, at: number) => {
        mix.add(woodTap(mix, { ...DIE_CLACK, hz: DIE_CLACK.hz * (1 + mix.between(-CLACK_SPREAD, CLACK_SPREAD)) }), { at, gain: force });
        mix.add(woodTap(mix, { hz: DICE_BOARD_HZ, decay: 0.05, hardness: 0.2 }), { at, gain: force * DIE_BOARD });
      };
      const seconds = DICE_CONFIG.dieMs / 1000;
      DIE_HITS.forEach(({ at }, hit) => clack(1 - HIT_FADE * hit, at * seconds));
      clack(FLAT.force, FLAT.after);
      const rest = DIE_HITS.at(-1)!.at * seconds;
      ROCKS.forEach(({ after, force }) => clack(force, rest + after));
    },
  },
  dieSix: {
    about: "The die lands on a 6: roll again! Two bright tines, the second higher.",
    level: "event",
    room: 0.16,
    render(mix) {
      mix.add(tine(mix, { note: "A5", ring: 0.14, hardness: 0.5 }), { gain: 0.7 });
      mix.add(tine(mix, { note: "D6", ring: 0.2, hardness: 0.5 }), { at: 0.09, gain: 0.8 });
    },
  },
});
