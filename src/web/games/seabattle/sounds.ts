import { defineSounds } from "../../sound/definition";
import { airWhoosh, bubbleSplash, cannonBoom, metalClick, metalClunk, shipHit, thock } from "./seaKit";

/**
 * The sea, the guns and the blasts, made to sound real (owner decision 2026-11-13: the toy-box versions sounded
 * fake): no notes or jingles on top; who it happened to is in how close and heavy it is (your own ship hit is nearer
 * and heavier). Placing is a ship's thock on the board and a whoosh of air, one sound each. All made by our own code
 * (`seaKit.ts`).
 */
export const SEABATTLE_SOUNDS = defineSounds({
  seaBattleShipPickedUp: {
    about: "Placing: you lift a ship to move it: one soft whoosh of air, rising.",
    level: "tap",
    room: 0.04,
    render(mix) {
      mix.add(airWhoosh(mix, { seconds: 0.14, fromHz: 350, toHz: 1_500, rising: true }));
    },
  },
  seaBattleShipPlaced: {
    about: "Placing: you set a ship down on the board: one rounded, hollow wooden thock.",
    level: "tap",
    room: 0.06,
    render(mix) {
      mix.add(thock(mix, { hz: 330 }));
    },
  },
  seaBattleShipTurned: {
    about: "Placing: a tap turns a ship round: one quick whoosh of air as it swings.",
    level: "tap",
    room: 0.04,
    render(mix) {
      mix.add(airWhoosh(mix, { seconds: 0.11, fromHz: 400, toHz: 1_700, rising: false }));
    },
  },
  seaBattleShipDocked: {
    about: "Placing: a ship goes back to the dock: the same thock, lower and softer.",
    level: "tap",
    room: 0.05,
    render(mix) {
      mix.add(thock(mix, { hz: 262, decay: 0.035 }));
    },
  },
  seaBattleShuffle: {
    about: "Placing: SHUFFLE: the fleet set down again in one quick riffle of light thocks.",
    level: "tap",
    room: 0.06,
    render(mix) {
      for (let i = 0; i < 4; i++) mix.add(thock(mix, { hz: mix.between(310, 390), decay: 0.03 }), { at: i * 0.042, gain: 1 - i * 0.15 });
    },
  },
  seaBattleAim: {
    about: "Holding to aim: a tiny metal click each time the crosshair (and your cannon) moves onto another cell, like a gun's sight stepping round.",
    level: "faint",
    room: 0.03,
    cooldownMs: 30,
    render(mix) {
      mix.add(metalClick(mix, { hz: 2_100 }));
    },
  },
  seaBattleCannonFire: {
    about: "A cannon fires (anyone's): one round, deep thoom.",
    level: "event",
    room: 0.1,
    render(mix) {
      mix.add(cannonBoom(mix));
    },
  },
  seaBattleSplash: {
    about: "A cannonball lands in the water (a miss, anyone's): one splash, a bright slap as it breaks the surface, then the water churning and dying away.",
    level: "event",
    room: 0.1,
    render(mix) {
      mix.add(bubbleSplash(mix));
    },
  },
  seaBattleHit: {
    about: "A cannonball hits a ship, watching: one crack-thoom, duller and further off.",
    level: "event",
    room: 0.14,
    render(mix) {
      mix.add(shipHit(mix, { weight: 1, brightness: 0.7 }));
    },
  },
  seaBattleYouHit: {
    about: "Your cannonball hits a ship: one sharp crack-thoom, the ship splintering.",
    level: "event",
    room: 0.1,
    render(mix) {
      mix.add(shipHit(mix, { weight: 1, brightness: 1 }));
    },
  },
  seaBattleYourShipHit: {
    about: "One of your ships is hit: the same crack-thoom, nearer and heavier.",
    level: "event",
    room: 0.08,
    render(mix) {
      mix.add(shipHit(mix, { weight: 1.3, brightness: 1 }));
    },
  },
  seaBattleCannonReady: {
    about: "The shooter's cannon comes in on their small board once the boards have traded places: one soft metal clunk.",
    level: "quiet",
    room: 0.08,
    render(mix) {
      mix.add(metalClunk(mix));
    },
  },
});
