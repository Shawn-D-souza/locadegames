import type { GameId } from "../../shared/games/catalog";
import { DOTSCLASH_SOUNDS } from "../games/dotsclash/sounds";
import { HEADCRASH_SOUNDS } from "../games/headcrash/sounds";
import { TERRITORY_SOUNDS } from "../games/territory/sounds";
import { TICTACTOE_SOUNDS } from "../games/tictactoe/sounds";
import { ULTIMATE_SOUNDS } from "../games/ultimate/sounds";
import type { SoundDefinition } from "./definition";
import { ENDING_SOUNDS } from "./library/endingSounds";
import { INTERFACE_SOUNDS } from "./library/interfaceSounds";
import { PLAYING_SOUNDS } from "./library/playingSounds";
import { ROOM_SOUNDS } from "./library/roomSounds";

/** Each game's own sounds, made only when that game is played. A new game adds its `games/<game>/sounds.ts` here, and in `SOUNDS`. */
export const GAME_SOUNDS = {
  tictactoe: TICTACTOE_SOUNDS,
  ultimate: ULTIMATE_SOUNDS,
  headcrash: HEADCRASH_SOUNDS,
  territory: TERRITORY_SOUNDS,
  dotsclash: DOTSCLASH_SOUNDS,
} as const satisfies Record<GameId, Record<string, SoundDefinition>>;

/** Sounds every visit needs, in the order they get made in the background: what's needed soonest first, the big endings last. */
const PLATFORM_SOUNDS = {
  ...INTERFACE_SOUNDS,
  ...ROOM_SOUNDS,
  ...PLAYING_SOUNDS,
  ...ENDING_SOUNDS,
};

export const SOUNDS = {
  ...PLATFORM_SOUNDS,
  ...TICTACTOE_SOUNDS,
  ...ULTIMATE_SOUNDS,
  ...HEADCRASH_SOUNDS,
  ...TERRITORY_SOUNDS,
  ...DOTSCLASH_SOUNDS,
};

/** The plain name of any sound; a typo is a compile error. */
export type SoundName = keyof typeof SOUNDS;

/** One sound placed in a sequence of them: a whole moment, timed to its animation. */
export interface SoundStep {
  sound: SoundName;
  /** Ms from the start of the sequence. */
  at: number;
  /** Which take; left out, takes play in turn. */
  variant?: number;
  /** 0 … 1, on top of the sound's own level. */
  volume?: number;
}

/** Where a loop is heading: its volume and rate (1 is as made; above is faster and higher), reached in `inSeconds` from now. */
export interface LoopPoint {
  inSeconds: number;
  volume: number;
  rate: number;
}

export const soundDefinition = (name: SoundName): SoundDefinition => SOUNDS[name];
export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];
export const PLATFORM_SOUND_NAMES = Object.keys(PLATFORM_SOUNDS) as SoundName[];
export const gameSoundNames = (game: GameId) => Object.keys(GAME_SOUNDS[game]) as SoundName[];
