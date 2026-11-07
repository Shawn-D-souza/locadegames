/** Made by `scripts/soundFilesPlugin.ts`: every sound's files and what the player needs to know, by sound name. */
declare module "virtual:sound-files" {
  import type { SoundFileEntry } from "./files";
  import type { SoundName } from "./soundBook";

  export const SOUND_FILES: Record<SoundName, SoundFileEntry>;
}
