// Stands in for the app's sound player in the video: the video's sound is its own music and effects track.
const NONE = { stop() {}, to() {} };
export type PlayOptions = { variant?: number; volume?: number; delayMs?: number };
export type SoundHandle = { stop(): void };
export type LoopHandle = SoundHandle;
export const installSound = () => {};
export const prepareGameSounds = () => {};
export const playSound = (..._: unknown[]) => NONE;
export const playSoundSequence = (..._: unknown[]) => NONE;
export const startSoundLoop = (..._: unknown[]) => NONE;
export const isSoundOn = () => false;
export const isSilentLoop = () => true;
export const setSoundOn = () => {};
export const subscribeSoundOn = () => () => {};
export const getSoundVolume = () => 0;
export const setSoundVolume = () => {};
export const subscribeSoundVolume = subscribeSoundOn;
