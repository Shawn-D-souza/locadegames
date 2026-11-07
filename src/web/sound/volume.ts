/** The Settings volume, 0 … 100: 100 is every sound as it was made. */
export const DEFAULT_VOLUME = 100;
export const VOLUME_STEP = 5;

/** What to multiply the sound by. Ears hear loudness on a curve, so a straight line would seem to do little until near the bottom; squared, the steps sound even. */
export const volumeGain = (volume: number) => (volume / 100) ** 2;

/** A volume from browser storage: nothing saved, or anything unreadable, is the default. */
export function parseVolume(stored: string | null): number {
  const volume = stored ? Number(stored) : NaN;
  return Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) : DEFAULT_VOLUME;
}
