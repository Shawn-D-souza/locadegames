import { DEFAULT_VOLUME, parseVolume } from "../sound/volume";

/** Browser storage for the player's name, settings and per-room reconnect tokens. */
const NAME_KEY = "locade:name";
const DEFAULT_NAME_KEY = "locade:defaultName";
const SOUND_KEY = "locade:sound";
const VOLUME_KEY = "locade:volume";
const HAPTICS_KEY = "locade:haptics";
const tokenKey = (code: string) => `locade:token:${code}`;

function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback; // Storage blocked (private mode, settings).
  }
}

/** The typed name; null on a first visit (nothing saved yet). */
export const loadPlayerName = () => safely(() => localStorage.getItem(NAME_KEY), null);
export const savePlayerName = (name: string) => safely(() => localStorage.setItem(NAME_KEY, name), undefined);

/** The random name given on the first visit; kept forever so it never changes. */
export const loadDefaultName = () => safely(() => localStorage.getItem(DEFAULT_NAME_KEY), null);
export const saveDefaultName = (name: string) => safely(() => localStorage.setItem(DEFAULT_NAME_KEY, name), undefined);

/** Sound effects are on unless turned off. */
export const loadSoundOn = () => safely(() => localStorage.getItem(SOUND_KEY) !== "off", true);
export const saveSoundOn = (on: boolean) => safely(() => localStorage.setItem(SOUND_KEY, on ? "on" : "off"), undefined);

/** The sound effects' volume, 0 … 100. */
export const loadSoundVolume = () => safely(() => parseVolume(localStorage.getItem(VOLUME_KEY)), DEFAULT_VOLUME);
export const saveSoundVolume = (volume: number) => safely(() => localStorage.setItem(VOLUME_KEY, String(volume)), undefined);

/** Haptics are on unless turned off. */
export const loadHapticsOn = () => safely(() => localStorage.getItem(HAPTICS_KEY) !== "off", true);
export const saveHapticsOn = (on: boolean) => safely(() => localStorage.setItem(HAPTICS_KEY, on ? "on" : "off"), undefined);

export const loadRoomToken = (code: string) => safely(() => sessionStorage.getItem(tokenKey(code)), null);
export const saveRoomToken = (code: string, token: string) =>
  safely(() => sessionStorage.setItem(tokenKey(code), token), undefined);
export const clearRoomToken = (code: string) => safely(() => sessionStorage.removeItem(tokenKey(code)), undefined);
