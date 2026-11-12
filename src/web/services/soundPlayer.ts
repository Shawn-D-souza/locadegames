import { SOUND_FILES } from "virtual:sound-files";
import type { GameId } from "../../shared/games/catalog";
import { soundStartSeconds } from "../sound/files";
import type { LoopPoint, SoundName, SoundStep } from "../sound/soundBook";
import { volumeGain } from "../sound/volume";
import { feelSound, feelSoundSequence } from "./hapticPlayer";
import { loadSoundOn, loadSoundVolume, saveSoundOn, saveSoundVolume } from "./sessionStore";

/**
 * Plays the sounds, the app's one door to the speakers. Sounds are files made when the site is built (see
 * `sound/files.ts`): the platform's are downloaded when the page opens, a game's when that game starts, and the
 * browser decodes them off the game's thread and keeps them, so playing one costs almost nothing and starts at once.
 * Nothing is ever made on the phone, so a sound can never cost the game a frame. Works with what phones insist on:
 * audio only starts from a finger on the screen, stops when the app is hidden, and doesn't interrupt your music.
 */

export interface PlayOptions {
  /** Which take; left out, takes play in turn. */
  variant?: number;
  /** 0 … 1, on top of the sound's own level. */
  volume?: number;
  /** Starts this much later (scheduled on the audio clock, so exactly). */
  delayMs?: number;
}

/** Stops a sound or a sequence early, with a short fade. */
export interface SoundHandle {
  stop(): void;
}

export interface LoopHandle extends SoundHandle {
  /**
   * Sets the loop on its way, in straight lines from where it is now through these points: the audio clock runs it
   * by itself, so nothing needs calling each frame. Replaces any course set before.
   */
  glide(points: readonly LoopPoint[]): void;
  /** Takes the top off above this frequency, so the same sound can go darker without a break. Eases over `TONE_RAMP_SECONDS`. */
  setTone(cutoffHz: number): void;
}

const NO_HANDLE: LoopHandle = { stop() {}, glide() {}, setTone() {} };
/** The same sound again within this time would only smear into itself. */
const DEFAULT_COOLDOWN_MS = 35;
const MAX_VOICES = 24;
const STOP_FADE_SECONDS = 0.1;
const TONE_RAMP_SECONDS = 0.12;
/** Quick enough that a tick played right after a change is already at its new volume, slow enough not to click. */
const VOLUME_RAMP_SECONDS = 0.01;
/** A loop's tone control starts fully open: above everything a sound made at 32 kHz holds. */
const OPEN_TONE_HZ = 16_000;
/** A sound asked for while audio is waking up, or before its file is in, plays if ready within this time, or is dropped: late is worse than silent. */
const MAX_LATENESS_MS = 250;
/** Files downloaded and decoded at once. */
const MAX_LOADS = 4;
const LIMITER_INPUT = 0.6;
const LIMITER_POINTS = 2_049;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** A decoded file: the sound starts `start` seconds in (after the file's marker). */
interface Ready {
  buffer: AudioBuffer;
  start: number;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let soundOn = loadSoundOn();
let soundVolume = loadSoundVolume();
const listeners = new Set<() => void>();
/** By file URL. */
const downloads = new Map<string, Promise<ArrayBuffer | null>>();
const ready = new Map<string, Ready>();
const requested = new Set<string>();
/** Files to decode next, a few at a time, so a game that just started can go ahead of the rest. */
let queue: string[] = [];
let loading = 0;
const nextTake = new Map<SoundName, number>();
const lastPlayedAt = new Map<SoundName, number>();
const voices = new Set<Voice>();
const loops = new Set<LoopHandle>();
let waiting: { urls: string[]; run: () => void; askedAt: number }[] = [];

const fileOf = (name: SoundName, take: number) => SOUND_FILES[name].urls[take]!;
const takesOf = (name: SoundName) => SOUND_FILES[name].urls.length;
const PLATFORM_FILES = Object.values(SOUND_FILES).flatMap((entry) => (entry.game ? [] : entry.urls));
const gameFiles = (game: GameId) => Object.values(SOUND_FILES).flatMap((entry) => (entry.game === game ? entry.urls : []));

/**
 * The way out to the speaker: quiet sounds pass untouched; when several overlap, the peaks get rounded off instead
 * of clipping. A curve only takes -1…1, so the signal goes in lowered and comes out raised by the same amount.
 */
function connectLimiter(ctx: AudioContext, input: AudioNode) {
  const headroom = ctx.createGain();
  headroom.gain.value = LIMITER_INPUT;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(LIMITER_POINTS);
  const knee = 0.5;
  const room = LIMITER_INPUT - knee;
  for (let i = 0; i < LIMITER_POINTS; i++) {
    const x = (i / (LIMITER_POINTS - 1)) * 2 - 1;
    const over = Math.max(0, Math.abs(x) - knee);
    curve[i] = Math.sign(x) * (Math.min(Math.abs(x), knee) + room * Math.tanh(over / room));
  }
  shaper.curve = curve;
  const makeUp = ctx.createGain();
  makeUp.gain.value = 1 / LIMITER_INPUT;
  input.connect(headroom).connect(shaper).connect(makeUp).connect(ctx.destination);
}

/** The file's bytes, fetched once (the browser keeps the file too: its name changes whenever the sound does). */
function download(url: string): Promise<ArrayBuffer | null> {
  let bytes = downloads.get(url);
  if (!bytes) {
    bytes = fetch(url)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    downloads.set(url, bytes);
  }
  return bytes;
}

async function decode(url: string) {
  const bytes = await download(url);
  if (!bytes || !context) {
    downloads.delete(url);
    requested.delete(url);
    return;
  }
  try {
    // A copy: decoding takes the bytes over, and they may be needed again if audio is ever started anew.
    const buffer = await context.decodeAudioData(bytes.slice(0));
    ready.set(url, { buffer, start: soundStartSeconds(buffer.getChannelData(0), buffer.sampleRate) });
  } catch {
    requested.delete(url);
  }
}

function loadNext() {
  if (!context) return;
  while (loading < MAX_LOADS && queue.length) {
    const url = queue.shift()!;
    if (ready.has(url)) continue;
    loading += 1;
    void decode(url).finally(() => {
      loading -= 1;
      flushWaiting();
      loadNext();
    });
  }
}

/** Puts these files in line, ahead of what's waiting or behind it. */
function enqueue(urls: readonly string[], ahead: boolean) {
  const added = urls.filter((url) => !requested.has(url));
  for (const url of added) requested.add(url);
  const moved = ahead ? urls.filter((url) => !ready.has(url)) : added;
  if (ahead) queue = [...moved, ...queue.filter((url) => !moved.includes(url))];
  else queue = [...queue, ...added];
  loadNext();
}

const isReady = (urls: readonly string[]) => context?.state === "running" && urls.every((url) => ready.has(url));

function flushWaiting() {
  const now = performance.now();
  const due = waiting;
  waiting = [];
  for (const item of due) {
    if (now - item.askedAt > MAX_LATENESS_MS) continue;
    if (isReady(item.urls)) item.run();
    else waiting.push(item);
  }
}

function wake() {
  if (!context) {
    const Context = window.AudioContext;
    if (!Context) return;
    // On iPhones this makes our sounds mix with whatever's playing and obey the silent switch, like a game's should.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "ambient";
    context = new Context({ latencyHint: "interactive" });
    master = context.createGain();
    master.gain.value = volumeGain(soundVolume);
    connectLimiter(context, master);
    context.addEventListener("statechange", () => {
      if (context?.state === "running") flushWaiting();
    });
    enqueue(PLATFORM_FILES, false);
  }
  if (context.state !== "running" && document.visibilityState === "visible") void context.resume().catch(() => undefined);
}

/** Runs now if audio is awake and these files are in, or as soon as they are (within reason). */
function whenReady(urls: string[], run: () => void) {
  if (!context) return;
  if (isReady(urls)) {
    run();
    return;
  }
  waiting.push({ urls, run, askedAt: performance.now() });
  enqueue(urls, true);
}

/**
 * Call once at startup. Browsers only let audio start from a user gesture, so every touch wakes it if it's
 * asleep (a phone call or an app switch can put it back to sleep at any time). While hidden, it sleeps.
 */
export function installSound() {
  for (const type of ["pointerdown", "touchend", "keydown", "click"] as const) {
    window.addEventListener(type, wake, { capture: true, passive: true });
  }
  // The platform's files start downloading once the page has settled, so they're in by the first tap.
  window.addEventListener("load", () => setTimeout(() => PLATFORM_FILES.forEach((url) => void download(url))), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.visibilityState === "hidden") void context.suspend().catch(() => undefined);
    else void context.resume().catch(() => undefined);
  });
}

/** Gets a game's own sounds ready, ahead of anything else waiting. Call when the game starts; twice does nothing. */
export function prepareGameSounds(game: GameId) {
  const urls = gameFiles(game);
  for (const url of urls) void download(url);
  enqueue(urls, true);
}

/** Only once its file is ready (see `whenReady`). */
function startVoice(name: SoundName, variant: number, volume: number, when: number, loop = false): Voice | null {
  const file = ready.get(fileOf(name, variant));
  if (!context || !master || !file) return null;
  if (voices.size >= MAX_VOICES) {
    const oldest = voices.values().next().value;
    if (oldest) stopVoice(oldest);
  }
  const source = context.createBufferSource();
  source.buffer = file.buffer;
  const loopSeconds = SOUND_FILES[name].loopSeconds;
  if (loop && loopSeconds !== undefined) {
    source.loop = true;
    source.loopStart = file.start;
    source.loopEnd = file.start + loopSeconds;
  }
  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(master);
  const voice = { source, gain };
  voices.add(voice);
  source.onended = () => {
    voices.delete(voice);
    gain.disconnect();
  };
  source.start(when, file.start);
  return voice;
}

function stopVoice(voice: Voice) {
  if (!context) return;
  const now = context.currentTime;
  voice.gain.gain.setTargetAtTime(0, now, STOP_FADE_SECONDS / 3);
  try {
    voice.source.stop(now + STOP_FADE_SECONDS);
  } catch {
    // Already stopped.
  }
  voices.delete(voice);
}

function pickTake(name: SoundName, variant: number | undefined): number {
  const takes = takesOf(name);
  if (variant !== undefined) return Math.max(0, Math.min(takes - 1, Math.floor(variant)));
  const take = nextTake.get(name) ?? 0;
  nextTake.set(name, (take + 1) % takes);
  return take;
}

/** Development only: what was played, in order, for playtests to check. */
function log(name: SoundName) {
  if (import.meta.env.DEV) ((window as unknown as { soundLog?: string[] }).soundLog ??= []).push(name);
}

/** Plays a sound, and what it feels like (that part even with sound off). Safe to call any time: with sound off or audio asleep it just does nothing. */
export function playSound(name: SoundName, { variant, volume = 1, delayMs = 0 }: PlayOptions = {}): SoundHandle {
  const now = performance.now();
  const cooldown = SOUND_FILES[name].cooldownMs ?? DEFAULT_COOLDOWN_MS;
  if (now - (lastPlayedAt.get(name) ?? -Infinity) < cooldown) return NO_HANDLE;
  lastPlayedAt.set(name, now);
  feelSound(name);
  if (!soundOn) return NO_HANDLE;
  log(name);
  const take = pickTake(name, variant);
  let voice: Voice | null = null;
  let stopped = false;
  whenReady([fileOf(name, take)], () => {
    if (!stopped) voice = startVoice(name, take, volume, context!.currentTime + delayMs / 1000);
  });
  return {
    stop() {
      stopped = true;
      if (voice) stopVoice(voice);
    },
  };
}

/** Plays sounds at exact times, and what they feel like: a whole moment (an ending) timed to its animation. Stopping it stops the lot, played or not. */
export function playSoundSequence(steps: readonly SoundStep[]): SoundHandle {
  const feel = feelSoundSequence(steps);
  if (!soundOn) return feel;
  const playing: Voice[] = [];
  let stopped = false;
  for (const step of steps) log(step.sound);
  const takes = steps.map((step) => pickTake(step.sound, step.variant));
  whenReady(
    steps.map((step, i) => fileOf(step.sound, takes[i]!)),
    () => {
      if (stopped) return;
      const start = context!.currentTime;
      steps.forEach((step, i) => {
        const voice = startVoice(step.sound, takes[i]!, step.volume ?? 1, start + step.at / 1000);
        if (voice) playing.push(voice);
      });
    },
  );
  return {
    stop() {
      stopped = true;
      feel.stop();
      for (const voice of playing) stopVoice(voice);
    },
  };
}

/** Starts a looping sound that goes on until stopped. */
export function startSoundLoop(name: SoundName): LoopHandle {
  if (!soundOn || !context) return NO_HANDLE;
  if (!isReady([fileOf(name, 0)])) {
    enqueue([fileOf(name, 0)], true);
    return NO_HANDLE;
  }
  log(name);
  const voice = startVoice(name, 0, 0, context.currentTime, true);
  if (!voice) return NO_HANDLE;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = OPEN_TONE_HZ;
  voice.gain.disconnect();
  voice.gain.connect(tone).connect(master!);
  const handle: LoopHandle = {
    stop() {
      loops.delete(handle);
      stopVoice(voice);
    },
    glide(points) {
      const now = context!.currentTime;
      for (const [param, of] of [
        [voice.gain.gain, (point: LoopPoint) => point.volume],
        [voice.source.playbackRate, (point: LoopPoint) => point.rate],
      ] as const) {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        for (const point of points) param.linearRampToValueAtTime(of(point), now + point.inSeconds);
      }
    },
    setTone(cutoffHz) {
      tone.frequency.setTargetAtTime(cutoffHz, context!.currentTime, TONE_RAMP_SECONDS);
    },
  };
  loops.add(handle);
  return handle;
}

export const isSoundOn = () => soundOn;

/** Whether this loop handle plays nothing (it was asked for while sound was off, audio asleep, or its file not in yet), so it should be asked for again. */
export const isSilentLoop = (handle: LoopHandle) => handle === NO_HANDLE;

export function setSoundOn(on: boolean) {
  soundOn = on;
  saveSoundOn(on);
  if (!on) for (const loop of [...loops]) loop.stop();
  for (const listener of listeners) listener();
}

export function subscribeSoundOn(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSoundVolume = () => soundVolume;

/** 0 … 100, for everything that plays. Eases there, so moving the slider while something plays doesn't click. */
export function setSoundVolume(volume: number) {
  soundVolume = volume;
  saveSoundVolume(volume);
  if (context && master) master.gain.setTargetAtTime(volumeGain(volume), context.currentTime, VOLUME_RAMP_SECONDS);
  for (const listener of listeners) listener();
}

export const subscribeSoundVolume = subscribeSoundOn;
