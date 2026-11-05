// Renders every sound the app can make to WAV files in dist/sounds/ (the same code the browser runs), and prints
// each one's length, peak and loudness on a phone. To listen outside the app, or to put them on a phone.
// Usage: npm run sounds
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const OUT = new URL("../dist/sounds/", import.meta.url).pathname;

/** 16-bit stereo WAV. */
function wav(left, right, sampleRate) {
  const data = Buffer.alloc(left.length * 4);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(sampleRate, 24);
  head.writeUInt32LE(sampleRate * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { SOUND_NAMES, soundDefinition } = await vite.ssrLoadModule("/sound/soundBook.ts");
  const { renderSound, SOUND_SAMPLE_RATE } = await vite.ssrLoadModule("/sound/definition.ts");
  const { phoneLoudnessDb } = await vite.ssrLoadModule("/sound/dsp/master.ts");
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  let renderMs = 0;
  let files = 0;
  for (const name of SOUND_NAMES) {
    const definition = soundDefinition(name);
    const takes = definition.variants ?? 1;
    for (let take = 0; take < takes; take++) {
      const started = performance.now();
      const [left, right] = renderSound(name, definition, take);
      renderMs += performance.now() - started;
      await writeFile(`${OUT}${name}${takes > 1 ? `-${take}` : ""}.wav`, wav(left, right, SOUND_SAMPLE_RATE));
      files += 1;
      if (take === 0) {
        const peak = left.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
        const ms = String(Math.round((left.length / SOUND_SAMPLE_RATE) * 1000)).padStart(5);
        const dbfs = (20 * Math.log10(peak)).toFixed(1).padStart(6);
        const loud = phoneLoudnessDb(left, right, SOUND_SAMPLE_RATE).toFixed(1).padStart(6);
        console.log(`${name.padEnd(30)} ${definition.level.padEnd(12)} ${ms} ms  peak ${dbfs} dB  phone ${loud} dB  ×${takes}`);
      }
    }
  }
  console.log(`\n${files} files in dist/sounds/; ${Math.round(renderMs)} ms to render them all`);
} finally {
  await vite.close();
}
