import { defineHaptics } from "../../haptics/definition";

/**
 * What you feel in a match: only what happens to you or what you did. Drawing a trail is quiet in the hand (no
 * buzzing while you steer), so the moments stand out: captures grow with the land, going out is the hardest thing here.
 */
export const TERRITORY_HAPTICS = defineHaptics({
  territoryLeftLand: { about: "Your head leaves your land: the pen touching down.", pulses: [{ at: 0, level: "selection" }] },
  territoryCaptureSmall: { about: "A small piece of land is yours.", pulses: [{ at: 0, level: "light" }] },
  territoryCaptureMedium: { about: "A good piece of land: two steps up.", pulses: [{ at: 0, level: "light" }, { at: 70, level: "medium" }] },
  territoryCaptureLarge: { about: "A lot of land: three steps up, landing hard.", pulses: [{ at: 0, level: "light" }, { at: 70, level: "medium" }, { at: 150, level: "heavy" }] },
  territoryKnockedSomeoneOut: { about: "You knocked someone out: a hard hit and its echo, with the stamp.", pulses: [{ at: 0, level: "heavy" }, { at: 100, level: "medium" }] },
  territoryYouAreOut: {
    about: "You're out: two hard hits, then it falls away, with the hard shake.",
    pulses: [{ at: 0, level: "heavy" }, { at: 70, level: "heavy" }, { at: 190, level: "medium" }, { at: 320, level: "light" }],
  },
  territoryHeadBump: { about: "Your head meets another: a solid knock, once per touch.", pulses: [{ at: 0, level: "medium" }] },
  territoryWallBump: { about: "Your head touches the wall: a dull knock, once per touch.", pulses: [{ at: 0, level: "light" }] },
  territoryWinnerHeadDrop: { about: "The winner's big head lands on the arena.", pulses: [{ at: 0, level: "medium" }] },
});
