import { SOUND_SAMPLE_RATE } from "./sampleRate";

/**
 * Sounds ship as MP3 files, made from the sound book when the site is built (`scripts/soundFilesPlugin.ts`), so a
 * phone never spends time making them: it downloads each once, keeps it, and the browser decodes it off the game's
 * thread. MP3 decoders add a little silence at the start, and not all the same amount, so every file starts with a
 * marker click: the player finds it, then starts each sound exactly `markerToSound` samples after it.
 * Pure: shared by the build and the player.
 */
export const SOUND_FILE = {
  /** Clean on a phone's speaker or earbuds for sounds made at 32 kHz. Not lower: below this the encoder quietly drops to 24 kHz (and breaks). */
  bitrateKbps: 80,
  /** Where the marker click is in the file (samples at `SOUND_SAMPLE_RATE`). */
  markerAt: 1_152,
  /** The marker's height (1 is full scale). */
  markerLevel: 0.9,
  /** From the marker to the sound: room for any decoder's start silence, and for the click to die away. */
  markerToSound: 2_304,
  /** The marker is looked for in this many first samples (any decoder's delay is far less than `markerToSound`). */
  markerSearch: 2_800,
} as const;

/** What the virtual module `virtual:sound-files` holds per sound (see `soundFiles.d.ts`). */
export interface SoundFileEntry {
  /** One file per take, in take order. */
  urls: string[];
  /** Plays again no sooner than this; left out, the player's default. */
  cooldownMs?: number;
  /** A loop of this many seconds (from the sound's start) instead of a one-shot. */
  loopSeconds?: number;
  /** Which game it belongs to: fetched when that game starts. Left out: the platform's, fetched on every visit. */
  game?: string;
}

/** Where a decoded file's sound starts (seconds), from its first channel at the rate it was decoded to. */
export function soundStartSeconds(channel: Float32Array, sampleRate: number): number {
  const scale = sampleRate / SOUND_SAMPLE_RATE;
  const end = Math.min(channel.length, Math.ceil(SOUND_FILE.markerSearch * scale));
  let peak = 0;
  let at = 0;
  for (let i = 0; i < end; i++) {
    const level = Math.abs(channel[i]!);
    if (level > peak) {
      peak = level;
      at = i;
    }
  }
  return at / sampleRate + SOUND_FILE.markerToSound / SOUND_SAMPLE_RATE;
}
