// Stands in for the app's haptics player in the video.
const NONE = { stop() {} };
export type HapticHandle = { stop(): void };
export const hapticsAvailable = () => false;
export const hapticTarget = () => {};
export const playHaptic = (..._: unknown[]) => NONE;
export const playHapticSequence = (..._: unknown[]) => NONE;
export const feelSound = () => {};
export const feelSoundSequence = (..._: unknown[]) => NONE;
export const installHaptics = () => {};
export const isHapticsOn = () => false;
export const setHapticsOn = () => {};
export const subscribeHapticsOn = () => () => {};
