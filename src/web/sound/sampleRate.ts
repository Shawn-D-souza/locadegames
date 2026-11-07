/**
 * Every sound is made at this rate, whatever the phone runs at, and the browser converts it as it plays. It carries
 * everything up to 16 kHz, more than a phone's speaker gives, for two-thirds of the work and memory of 48 kHz.
 */
export const SOUND_SAMPLE_RATE = 32_000;
