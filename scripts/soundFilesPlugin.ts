import { createHash } from "node:crypto";
import { Mp3Encoder } from "@breezystack/lamejs";
import { fileURLToPath } from "node:url";
import { runnerImport, type Plugin } from "vite";
import type { SoundFileEntry } from "../src/web/sound/files.ts";
import type { SoundName } from "../src/web/sound/soundBook.ts";

type Source = typeof import("../src/web/sound/soundSource.ts");

/**
 * Makes every sound in the sound book into an MP3 file, once, on this computer (see `src/web/sound/files.ts`), and
 * gives the app the list as `virtual:sound-files`. Built: hashed files in `assets/sounds/`, kept by phones forever.
 * In development: served from memory, and made again (with a page reload) when a sound's code changes. The sound
 * code is loaded through Vite's module runner, so it stays out of the config.
 */

const MODULE_ID = "virtual:sound-files";
const RESOLVED_ID = `\0${MODULE_ID}`;
const DEV_PATH = "/@sound-files/";
/** LAME takes its input in frames of this many samples. */
const FRAME = 1_152;
const SOURCE = fileURLToPath(new URL("../src/web/sound/soundSource.ts", import.meta.url));
/** Changes to these files can change a sound. */
const SOUND_CODE = /[\\/]src[\\/](web[\\/]sound[\\/]|web[\\/]games[\\/][^\\/]+[\\/]sounds\.ts$|shared[\\/])/;

interface SoundFile {
  name: SoundName;
  path: string;
  bytes: Uint8Array;
  /** What the player needs to know about its sound. */
  about: Omit<SoundFileEntry, "urls">;
}

/** The marker click, the gap, then the sound, as 16-bit samples. */
function withMarker({ SOUND_FILE }: Source, track: Float32Array): Int16Array {
  const out = new Int16Array(SOUND_FILE.markerAt + SOUND_FILE.markerToSound + track.length);
  out[SOUND_FILE.markerAt] = Math.round(SOUND_FILE.markerLevel * 32_767);
  const start = SOUND_FILE.markerAt + SOUND_FILE.markerToSound;
  for (let i = 0; i < track.length; i++) out[start + i] = Math.round(Math.max(-1, Math.min(1, track[i]!)) * 32_767);
  return out;
}

function encodeMp3(source: Source, left: Float32Array, right: Float32Array): Uint8Array {
  const { SOUND_FILE, SOUND_SAMPLE_RATE } = source;
  const l = withMarker(source, left);
  const r = withMarker(source, right);
  const encoder = new Mp3Encoder(2, SOUND_SAMPLE_RATE, SOUND_FILE.bitrateKbps);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < l.length; i += FRAME) parts.push(encoder.encodeBuffer(l.subarray(i, i + FRAME), r.subarray(i, i + FRAME)));
  parts.push(encoder.flush());
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  checkHeader(bytes, SOUND_SAMPLE_RATE);
  return bytes;
}

/** The first frame must be MPEG-1 Layer III at 32 kHz: the encoder resamples on its own at low bitrates, and its resampling is broken. */
function checkHeader(bytes: Uint8Array, SOUND_SAMPLE_RATE: number) {
  const [sync, version, rate] = [bytes[0]!, bytes[1]!, bytes[2]!];
  const mpeg1Layer3 = sync === 0xff && (version & 0xfe) === 0xfa;
  const at32kHz = ((rate >> 2) & 0b11) === 0b10;
  if (!mpeg1Layer3 || !at32kHz) throw new Error(`Sound files: the MP3 encoder didn't keep ${SOUND_SAMPLE_RATE} Hz; raise SOUND_FILE.bitrateKbps.`);
}

function gameOf({ GAME_SOUNDS }: Source, name: SoundName): string | undefined {
  return Object.entries(GAME_SOUNDS).find(([, sounds]) => name in sounds)?.[0];
}

async function makeFiles(root: string): Promise<SoundFile[]> {
  const { module: source } = await runnerImport<Source>(SOURCE, { root, configFile: false, logLevel: "silent" });
  const { SOUND_NAMES, soundDefinition, renderSound } = source;
  const files: SoundFile[] = [];
  for (const name of SOUND_NAMES) {
    const definition = soundDefinition(name);
    const takes = definition.variants ?? 1;
    for (let take = 0; take < takes; take++) {
      const bytes = encodeMp3(source, ...renderSound(name, definition, take));
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
      const entry = soundDefinition(name);
      const game = gameOf(source, name);
      files.push({
        name,
        path: `sounds/${name}${takes > 1 ? `-${take}` : ""}-${hash}.mp3`,
        bytes,
        about: {
          ...(entry.cooldownMs !== undefined && { cooldownMs: entry.cooldownMs }),
          ...(entry.loopSeconds !== undefined && { loopSeconds: entry.loopSeconds }),
          ...(game && { game }),
        },
      });
    }
  }
  return files;
}

export function soundFiles(): Plugin {
  let files: Promise<SoundFile[]> | null = null;
  let building = false;
  let root = process.cwd();
  let base = "/";
  let assetsDir = "assets";
  const allFiles = () => (files ??= makeFiles(root));

  return {
    name: "locade-sound-files",
    configResolved(config) {
      building = config.command === "build";
      root = config.root;
      base = config.base;
      assetsDir = config.build.assetsDir;
    },
    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const entries: Partial<Record<SoundName, SoundFileEntry>> = {};
      for (const file of await allFiles()) {
        let url = `${base}${DEV_PATH.slice(1)}${file.path}`;
        if (building) {
          const fileName = `${assetsDir}/${file.path}`;
          this.emitFile({ type: "asset", fileName, source: file.bytes });
          url = `${base}${fileName}`;
        }
        (entries[file.name] ??= { urls: [], ...file.about }).urls.push(url);
      }
      return `export const SOUND_FILES = ${JSON.stringify(entries)};`;
    },
    configureServer(server) {
      server.middlewares.use(DEV_PATH, (req, res, next) => {
        void allFiles().then((all) => {
          const file = all.find((f) => `/${f.path}` === req.url);
          if (!file) return next();
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "no-cache");
          res.end(file.bytes);
        }, next);
      });
      server.watcher.on("change", (path) => {
        if (!SOUND_CODE.test(path)) return;
        files = null;
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}
