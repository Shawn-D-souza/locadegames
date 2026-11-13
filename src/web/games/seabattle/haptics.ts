import { defineHaptics } from "../../haptics/definition";
import { durations } from "../../../theme";

/** A sunk ship slams down onto its cells as its blast goes off: the spring easing passes its end point at about a third of its length. */
const WRECK_LANDS_MS = Math.round(durations.celebrate * 0.34);
/** Your own ship's wreck: how long after it lands the weight fades. */
const WRECK_FADES_MS = 230;

/**
 * Your hands on your fleet while placing (small ticks, a ship set down a little firmer); firing your cannon is the
 * game, felt firmly as you let go; your hits are good news, a sinking lands twice (the blast, the wreck); your ships
 * hit is a weight, sunk a weight that slams again and fades; your turn coming round. Others' shots aren't felt. Most
 * come with their sound (`soundHaptics.ts`); a sinking has no sound of its own (it plays the hit's), so its feel is
 * played with it (`landingCue`), as are firing and your turn.
 */
export const SEABATTLE_HAPTICS = defineHaptics({
  seaBattleShipPickedUp: { about: "Placing: a ship lifts off to follow your finger.", pulses: [{ at: 0, level: "selection" }] },
  seaBattleShipPlaced: { about: "Placing: you put a ship down on the board.", pulses: [{ at: 0, level: "light" }] },
  seaBattleShipTurned: { about: "Placing: a ship turns under your tap.", pulses: [{ at: 0, level: "selection" }] },
  seaBattleShipDocked: { about: "Placing: a ship goes back to the dock.", pulses: [{ at: 0, level: "selection" }] },
  seaBattleFire: { about: "You let go and your cannon fires.", pulses: [{ at: 0, level: "medium" }] },
  seaBattleYouHit: { about: "Your cannonball hits a ship.", pulses: [{ at: 0, level: "medium" }] },
  seaBattleYouSank: {
    about: "You sank a ship: the blast, then the wreck slamming down.",
    pulses: [
      { at: 0, level: "medium" },
      { at: WRECK_LANDS_MS, level: "heavy" },
    ],
  },
  seaBattleYourShipHit: { about: "One of your ships is hit.", pulses: [{ at: 0, level: "heavy" }] },
  seaBattleYourShipSank: {
    about: "One of your ships sank: the blast, the wreck slamming down, then it fades.",
    pulses: [
      { at: 0, level: "heavy" },
      { at: WRECK_LANDS_MS, level: "heavy" },
      { at: WRECK_LANDS_MS + WRECK_FADES_MS, level: "light" },
    ],
  },
  seaBattleYourTurn: { about: "The boards traded places and your cannon is in: your turn to fire.", pulses: [{ at: 0, level: "light" }] },
});
