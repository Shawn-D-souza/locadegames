import data from "./cues.json";
import { FRAME } from "./look";

/** Every synced moment, from the music (src/cues.json, written by `npm run music`). */
export type CueName = (typeof data.cues)[number]["name"];

const byName = new Map(data.cues.map((c) => [c.name, c.t]));

/** When a cue happens, in seconds. */
export function cueSeconds(name: string): number {
  const t = byName.get(name);
  if (t === undefined) throw new Error(`No cue named ${name}`);
  return t;
}

/** When a cue happens, in frames. */
export const cue = (name: string) => Math.round(cueSeconds(name) * FRAME.fps);
export const seconds = (s: number) => Math.round(s * FRAME.fps);
/** One beat of the music, in frames (120 BPM). */
export const BEAT = seconds(data.beat);
export const MUSIC_SECONDS = data.seconds;
