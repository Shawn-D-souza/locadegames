import { finishLoop, finishSound } from "./dsp/master";
import { roomResponse, roomTail } from "./dsp/room";
import { Mix } from "./mix";
import { SOUND_SAMPLE_RATE } from "./sampleRate";

/**
 * How loud a sound is on a phone (dB, see `dsp/master.ts`): the hierarchy of the whole app. Say which kind of
 * sound it is and the level follows, so a new sound sits right among the others without tweaking.
 */
export const SOUND_LEVELS = {
  /** Barely there, heard all the time or in passing. */
  faint: -40,
  /** Small things: a friend's small action. */
  quiet: -35,
  /** Your finger on the interface. */
  tap: -31,
  /** Something happened: a move, a tick of the clock, a player arriving. */
  event: -26,
  /** Something big happened: the game starts, you capture a lot, you're knocked out. */
  moment: -21,
  /** You won. Nothing is louder. */
  celebration: -17,
} as const;

export type SoundLevel = keyof typeof SOUND_LEVELS;

export interface SoundDefinition {
  /** In plain words: which moment this is, as shown on the sound preview page. */
  about: string;
  level: SoundLevel;
  /** How much of the shared room to hear: 0 dry … 1 very roomy. Quick interface sounds stay close and dry. */
  room: number;
  /** Different takes of the sound: picked by whoever plays it (a player's note) or in turn, so repeats don't sound stamped out. */
  variants?: number;
  /** Plays again no sooner than this; default in `soundPlayer.ts`. */
  cooldownMs?: number;
  /** A loop of this many seconds instead of a one-shot (render at least `LOOP_CROSSFADE` longer than this). */
  loopSeconds?: number;
  /**
   * A loop with a lot of weight just above the shared low cut (a motor): its finishing filters are run once round
   * the loop before the real pass, so they meet its seam already going. Without it they start from silence on the
   * loop's first sample and it clicks once a loop.
   */
  deepLoop?: boolean;
  render(mix: Mix, variant: number): void;
}

export { SOUND_SAMPLE_RATE };

/** Keeps a book of sounds' exact names, so playing a sound that doesn't exist is a compile error. */
export const defineSounds = <T extends Record<string, SoundDefinition>>(sounds: T): T => sounds;

/** The start and end of a loop are blended over this long, so it has no seam. */
export const LOOP_CROSSFADE = 0.25;

/** Stable number from a name, so each sound has its own random takes. */
function seedOf(name: string, variant: number): number {
  let hash = 2_166_136_261;
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619);
  return (hash + variant * 7_919) >>> 0;
}

function closeLoop(track: Float32Array, length: number, fade: number): Float32Array {
  const out = track.slice(0, length);
  for (let i = 0; i < fade; i++) {
    const mix = i / fade;
    out[i] = out[i]! * Math.sqrt(mix) + track[length + i]! * Math.sqrt(1 - mix);
  }
  return out;
}

/** Makes one take of a sound: pure, and the same every time. Returns left and right. */
export function renderSound(name: string, definition: SoundDefinition, variant: number): [Float32Array, Float32Array] {
  const sampleRate = SOUND_SAMPLE_RATE;
  const mix = new Mix(sampleRate, seedOf(name, variant));
  definition.render(mix, variant);
  const target = SOUND_LEVELS[definition.level];
  if (definition.loopSeconds !== undefined) {
    const [left, right] = mix.bounce(0);
    const length = Math.round(definition.loopSeconds * sampleRate);
    const fade = Math.round(LOOP_CROSSFADE * sampleRate);
    return finishLoop(closeLoop(left, length, fade), closeLoop(right, length, fade), sampleRate, target, definition.deepLoop);
  }
  const [left, right] = mix.bounce(roomTail(definition.room));
  if (definition.room > 0) {
    const send = new Float32Array(left.length);
    for (let i = 0; i < send.length; i++) send[i] = (left[i]! + right[i]!) * 0.5 * definition.room;
    const [wetLeft, wetRight] = roomResponse(send, sampleRate);
    for (let i = 0; i < left.length; i++) {
      left[i]! += wetLeft[i]!;
      right[i]! += wetRight[i]!;
    }
  }
  return finishSound(left, right, sampleRate, target);
}
