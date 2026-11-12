import { defineHaptics } from "../../haptics/definition";

/**
 * Your tap is the game, felt firmly as your finger lands; your own chain is felt wave by wave, growing heavier as it
 * runs on; knocking someone out lands hard; being knocked out is a weight that fades. Others' moves aren't felt.
 */
export const DOTSCLASH_HAPTICS = defineHaptics({
  dotsClashTap: { about: "You tap a cell: your dot goes down.", pulses: [{ at: 0, level: "medium" }] },
  dotsClashStartsRevealed: { about: "Everyone's starts appear on the board: the game is on.", pulses: [{ at: 0, level: "light" }] },
  dotsClashYourTurn: { about: "The turn came round to you.", pulses: [{ at: 0, level: "light" }] },
  dotsClashBurst: { about: "A wave of your chain bursts.", pulses: [{ at: 0, level: "light" }] },
  dotsClashBigBurst: { about: "A wave of your chain bursts once it has run on a while: heavier.", pulses: [{ at: 0, level: "medium" }] },
  dotsClashKnockedSomeoneOut: { about: "Your chain knocked someone out: a hard hit and its echo.", pulses: [{ at: 0, level: "heavy" }, { at: 100, level: "medium" }] },
  dotsClashOut: { about: "You're out: one weight, then it fades.", pulses: [{ at: 0, level: "heavy" }, { at: 220, level: "light" }] },
});
