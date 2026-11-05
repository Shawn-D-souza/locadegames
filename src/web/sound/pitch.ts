/**
 * Every pitched sound in the app uses these notes and no others: D major pentatonic. Any of them sound fine
 * together, so sounds that overlap (a friend joining while you press a button) never clash. Sad moments lean
 * on B, the same notes' minor side, so they stay in the family. The type makes an off-scale note a compile error.
 */
type NoteName = "D" | "E" | "F#" | "A" | "B";
type Octave = 3 | 4 | 5 | 6 | 7;
export type ScaleNote = `${NoteName}${Octave}`;

const SEMITONES: Record<NoteName, number> = { D: 2, E: 4, "F#": 6, A: 9, B: 11 };
const NAMES = ["D", "E", "F#", "A", "B"] as const;

export function hz(note: ScaleNote): number {
  const name = note.slice(0, -1) as NoteName;
  const octave = Number(note.slice(-1));
  // A4 = 440 Hz.
  return 440 * Math.pow(2, (SEMITONES[name] + (octave - 4) * 12 - 9) / 12);
}

/** Walks up the scale: `step` 0 is D4, 1 is E4, 5 is D5, and so on. */
export function scaleStep(step: number): ScaleNote {
  const name = NAMES[step % NAMES.length]!;
  return `${name}${(4 + Math.floor(step / NAMES.length)) as Octave}`;
}

/**
 * Players are colors, and each also has a note: a room filling up climbs the scale. Same order as the colors.
 * Keep in step with `ROOM_CONFIG.maxPlayers`.
 */
export const PLAYER_NOTES: readonly ScaleNote[] = ["A4", "B4", "D5", "E5", "F#5", "A5", "B5", "D6"];
