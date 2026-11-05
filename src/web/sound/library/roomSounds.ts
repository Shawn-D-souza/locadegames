import { defineSounds } from "../definition";
import { mallet, pop, tine, woodTap } from "../kit";
import { PLAYER_NOTES } from "../pitch";

const PLAYERS = PLAYER_NOTES.length;

/** A room is friends gathering: warm, a little musical. Each player has their own note, so a filling room climbs the scale. */
export const ROOM_SOUNDS = defineSounds({
  roomEntered: {
    about: "You arrive in a room: one warm pop with a soft open chord in it, like a friend's arrival but a little bigger. A landing, not a tune.",
    level: "event",
    room: 0.28,
    render(mix) {
      mix.add(pop(mix, { note: "A4", from: 0.62, glide: 0.016, decay: 0.04 }), { gain: 0.55 });
      mix.add(mallet(mix, { note: "D4", ring: 0.24, hardness: 0.25 }), { at: 0.01, gain: 0.5 });
      mix.add(mallet(mix, { note: "A4", ring: 0.22, hardness: 0.3 }), { at: 0.016, gain: 0.6 });
      mix.add(mallet(mix, { note: "D5", ring: 0.22, hardness: 0.35 }), { at: 0.022 });
    },
  },
  playerJoined: {
    about: "A friend joins and their bar pops into the list. Take = player number: each player's own note, so a filling room climbs the scale.",
    level: "event",
    room: 0.26,
    variants: PLAYERS,
    render(mix, player) {
      const note = PLAYER_NOTES[player]!;
      mix.add(pop(mix, { note, from: 0.62, glide: 0.014, decay: 0.036 }), { gain: 0.55 });
      mix.add(mallet(mix, { note, ring: 0.17, hardness: 0.5 }), { at: 0.012 });
    },
  },
  playerLeft: {
    about: "A friend leaves and their bar shrinks out: their note, quieter, sinking away. Take = player number.",
    level: "quiet",
    room: 0.25,
    variants: PLAYERS,
    render(mix, player) {
      const note = PLAYER_NOTES[player]!;
      mix.add(pop(mix, { note, from: 1.3, glide: 0.018, decay: 0.05 }), { gain: 0.6 });
      mix.add(mallet(mix, { note, ring: 0.1, hardness: 0.2 }), { at: 0.01, gain: 0.9 });
    },
  },
  playerWentAway: {
    about: "A friend's phone slept or lost its connection, and their bar fades (AWAY). A very small tick; it happens a lot.",
    level: "faint",
    room: 0.15,
    render(mix) {
      mix.add(woodTap(mix, { hz: 640, decay: 0.012, hardness: 0.3 }));
      mix.add(woodTap(mix, { hz: 480, decay: 0.016, hardness: 0.25 }), { at: 0.06 });
    },
  },
  playerCameBack: {
    about: "An away friend is back: the same tick, going up.",
    level: "faint",
    room: 0.15,
    render(mix) {
      mix.add(woodTap(mix, { hz: 480, decay: 0.012, hardness: 0.3 }));
      mix.add(woodTap(mix, { hz: 640, decay: 0.016, hardness: 0.35 }), { at: 0.06 });
    },
  },
  gameSuggested: {
    about: "You tap a game to suggest it: the tile gets its coral outline and your avatar lands on its corner.",
    level: "quiet",
    room: 0.16,
    render(mix) {
      mix.add(woodTap(mix, { hz: 520, decay: 0.018, hardness: 0.55 }), { gain: 0.8 });
      mix.add(mallet(mix, { note: "A5", ring: 0.08, hardness: 0.45 }), { at: 0.006, gain: 0.72 });
    },
  },
  gameUnsuggested: {
    about: "You tap your suggested game again and take the suggestion back: a small pop sinking away.",
    level: "quiet",
    room: 0.08,
    render(mix) {
      mix.add(pop(mix, { note: "F#4", from: 1.25, glide: 0.016, decay: 0.03 }), { gain: 0.7 });
      mix.add(woodTap(mix, { hz: 450, decay: 0.014, hardness: 0.3 }), { gain: 0.5 });
    },
  },
  friendSuggestedGame: {
    about: "A friend suggests a game and their avatar lands on its tile. Take = player number: their note, up high and small.",
    level: "quiet",
    room: 0.18,
    variants: PLAYERS,
    render(mix, player) {
      const note = PLAYER_NOTES[player]!;
      mix.add(pop(mix, { note, from: 0.7, glide: 0.01, decay: 0.022 }), { gain: 0.5 });
      mix.add(tine(mix, { note, ring: 0.08, hardness: 0.35 }), { at: 0.008 });
    },
  },
  youBecameHost: {
    about: "The host left and the crown passes to you: a small crown of tines, your cue to pick the next game.",
    level: "event",
    room: 0.26,
    render(mix) {
      mix.add(tine(mix, { note: "F#5", ring: 0.08, hardness: 0.45 }), { gain: 0.7 });
      mix.add(tine(mix, { note: "A5", ring: 0.08, hardness: 0.45 }), { at: 0.075, gain: 0.8 });
      mix.add(tine(mix, { note: "D6", ring: 0.18, hardness: 0.45 }), { at: 0.15 });
      mix.add(mallet(mix, { note: "D5", ring: 0.1, hardness: 0.3 }), { at: 0.15, gain: 0.35 });
    },
  },
  gameStarting: {
    about: "The host picked a game and everyone is swept into it, right before the 3, 2, 1: room entered's warm pop and open chord, a step brighter. The countdown is what builds, so this only opens the door.",
    level: "event",
    room: 0.28,
    render(mix) {
      mix.add(pop(mix, { note: "D5", from: 0.62, glide: 0.016, decay: 0.04 }), { gain: 0.55 });
      mix.add(mallet(mix, { note: "D4", ring: 0.24, hardness: 0.25 }), { at: 0.01, gain: 0.5 });
      mix.add(mallet(mix, { note: "D5", ring: 0.22, hardness: 0.3 }), { at: 0.016, gain: 0.6 });
      mix.add(mallet(mix, { note: "A5", ring: 0.24, hardness: 0.35 }), { at: 0.022 });
    },
  },
});
