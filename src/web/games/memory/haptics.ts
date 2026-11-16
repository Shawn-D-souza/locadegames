import { defineHaptics } from "../../haptics/definition";

/** Your card is felt as your finger lands, a pair you find lands firmer, and the turn coming round is a nudge. Others' cards and pairs aren't felt. */
export const MEMORY_HAPTICS = defineHaptics({
  memoryTap: { about: "You turn a card.", pulses: [{ at: 0, level: "light" }] },
  memoryYourPair: { about: "You find a pair: turn again.", pulses: [{ at: 0, level: "medium" }] },
  memoryYourTurn: { about: "The turn came round to you.", pulses: [{ at: 0, level: "light" }] },
});
