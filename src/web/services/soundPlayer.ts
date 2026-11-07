import type { GameId } from "../../shared/games/catalog";
import { renderSound, SOUND_SAMPLE_RATE } from "../sound/definition";
import { gameSoundNames, PLATFORM_SOUND_NAMES, soundDefinition, type SoundName, type SoundStep } from "../sound/soundBook";
import type { RenderRequest, RenderResult } from "../sound/soundWorker";
import { volumeGain } from "../sound/volume";
import { feelSound, feelSoundSequence } from "./hapticPlayer";
import { loadSoundOn, loadSoundVolume, saveSoundOn, saveSoundVolume } from "./sessionStore";

/**
 * Plays the sounds, the app's one door to the speakers. Sounds are made ahead of time in a worker and kept as
 * ready buffers, so playing one costs almost nothing and starts at once: the platform's on the first touch, a
 * game's when that game starts. Works with what phones insist on:
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
  setVolume(volume: number): void;
  /** 1 is as made; above is faster and higher. */
  setRate(rate: number): void;
  /** Takes the top off above this frequency, so the same sound can go darker without a break. Eases over `TONE_RAMP_SECONDS`. */
  setTone(cutoffHz: number): void;
}

const NO_HANDLE: LoopHandle = { stop() {}, setVolume() {}, setRate() {}, setTone() {} };
/** The same sound again within this time would only smear into itself. */
const DEFAULT_COOLDOWN_MS = 35;
const MAX_VOICES = 24;
const STOP_FADE_SECONDS = 0.1;
const RAMP_SECONDS = 0.05;
const TONE_RAMP_SECONDS = 0.12;
/** Quick enough that a tick played right after a change is already at its new volume, slow enough not to click. */
const VOLUME_RAMP_SECONDS = 0.01;
/** A loop's tone control starts fully open: above everything a sound made at 32 kHz holds. */
const OPEN_TONE_HZ = 16_000;
/** A sound asked for while audio is still waking up plays if it's ready within this time, or is dropped: late is worse than silent. */
const MAX_LATENESS_MS = 250;
const LIMITER_INPUT = 0.6;
const LIMITER_POINTS = 2_049;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let worker: Worker | null = null;
let soundOn = loadSoundOn();
let soundVolume = loadSoundVolume();
const listeners = new Set<() => void>();
const buffers = new Map<string, AudioBuffer>();
const requested = new Set<string>();
/** What the worker makes next, one at a time, so a game that just started can go ahead of the rest. */
let queue: RenderRequest[] = [];
let workerBusy = false;
const nextTake = new Map<SoundName, number>();
const lastPlayedAt = new Map<SoundName, number>();
const voices = new Set<Voice>();
const loops = new Set<LoopHandle>();
let waiting: { run: () => void; askedAt: number }[] = [];

const bufferKey = (name: SoundName, variant: number) => `${name}:${variant}`;

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

function store(request: RenderRequest, left: Float32Array, right: Float32Array) {
  if (!context) return;
  const buffer = context.createBuffer(2, left.length, SOUND_SAMPLE_RATE);
  buffer.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
  buffer.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
  buffers.set(bufferKey(request.name, request.variant), buffer);
}

/** Now, on this thread: only for a sound needed before the worker got to it, which is rare and at worst a small hitch. */
function bufferNow(name: SoundName, variant: number): AudioBuffer {
  const key = bufferKey(name, variant);
  let buffer = buffers.get(key);
  if (!buffer) {
    const [left, right] = renderSound(name, soundDefinition(name), variant);
    store({ name, variant }, left, right);
    buffer = buffers.get(key)!;
  }
  return buffer;
}

function makeNext() {
  if (!worker || workerBusy || !context) return;
  let next = queue.shift();
  while (next && buffers.has(bufferKey(next.name, next.variant))) next = queue.shift();
  if (!next) return;
  workerBusy = true;
  worker.postMessage(next);
}

/** Puts every take of these sounds in line, ahead of what's waiting or behind it. */
function enqueue(names: readonly SoundName[], ahead: boolean) {
  const added: RenderRequest[] = [];
  for (const name of names) {
    const takes = soundDefinition(name).variants ?? 1;
    for (let variant = 0; variant < takes; variant++) {
      if (requested.has(bufferKey(name, variant))) continue;
      requested.add(bufferKey(name, variant));
      added.push({ name, variant });
    }
  }
  queue = ahead ? [...added, ...queue] : [...queue, ...added];
  makeNext();
}

function startWorker() {
  if (typeof Worker === "undefined") return;
  try {
    worker = new Worker(new URL("../sound/soundWorker.ts", import.meta.url), { type: "module" });
  } catch {
    return; // Sounds are then made when first played.
  }
  worker.onmessage = ({ data }: MessageEvent<RenderResult>) => {
    if (!buffers.has(bufferKey(data.name, data.variant))) store(data, data.left, data.right);
    workerBusy = false;
    makeNext();
  };
  enqueue(PLATFORM_SOUND_NAMES, false);
}

function flushWaiting() {
  const now = performance.now();
  const due = waiting;
  waiting = [];
  for (const item of due) if (now - item.askedAt <= MAX_LATENESS_MS) item.run();
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
    startWorker();
  }
  if (context.state !== "running" && document.visibilityState === "visible") void context.resume().catch(() => undefined);
}

/** Runs now if audio is awake, or as soon as it wakes (within reason). */
function whenAwake(run: () => void) {
  if (context?.state === "running") run();
  else if (context) waiting.push({ run, askedAt: performance.now() });
}

/**
 * Call once at startup. Browsers only let audio start from a user gesture, so every touch wakes it if it's
 * asleep (a phone call or an app switch can put it back to sleep at any time). While hidden, it sleeps.
 */
export function installSound() {
  for (const type of ["pointerdown", "touchend", "keydown", "click"] as const) {
    window.addEventListener(type, wake, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.visibilityState === "hidden") void context.suspend().catch(() => undefined);
    else void context.resume().catch(() => undefined);
  });
}

/** Gets a game's own sounds ready, ahead of anything else waiting. Call when the game starts; twice does nothing. */
export function prepareGameSounds(game: GameId) {
  enqueue(gameSoundNames(game), true);
}

function startVoice(name: SoundName, variant: number, volume: number, when: number, loop = false): Voice | null {
  if (!context || !master) return null;
  if (voices.size >= MAX_VOICES) {
    const oldest = voices.values().next().value;
    if (oldest) stopVoice(oldest);
  }
  const source = context.createBufferSource();
  source.buffer = bufferNow(name, variant);
  source.loop = loop;
  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(master);
  const voice = { source, gain };
  voices.add(voice);
  source.onended = () => {
    voices.delete(voice);
    gain.disconnect();
  };
  source.start(when);
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
  const takes = soundDefinition(name).variants ?? 1;
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
  const cooldown = soundDefinition(name).cooldownMs ?? DEFAULT_COOLDOWN_MS;
  if (now - (lastPlayedAt.get(name) ?? -Infinity) < cooldown) return NO_HANDLE;
  lastPlayedAt.set(name, now);
  feelSound(name);
  if (!soundOn) return NO_HANDLE;
  log(name);
  const take = pickTake(name, variant);
  let voice: Voice | null = null;
  let stopped = false;
  whenAwake(() => {
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
  whenAwake(() => {
    if (stopped) return;
    const start = context!.currentTime;
    for (const step of steps) {
      const voice = startVoice(step.sound, pickTake(step.sound, step.variant), step.volume ?? 1, start + step.at / 1000);
      if (voice) playing.push(voice);
    }
  });
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
  if (!soundOn || !context || context.state !== "running") return NO_HANDLE;
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
    setVolume(volume) {
      voice.gain.gain.setTargetAtTime(volume, context!.currentTime, RAMP_SECONDS);
    },
    setRate(rate) {
      voice.source.playbackRate.setTargetAtTime(rate, context!.currentTime, RAMP_SECONDS);
    },
    setTone(cutoffHz) {
      tone.frequency.setTargetAtTime(cutoffHz, context!.currentTime, TONE_RAMP_SECONDS);
    },
  };
  loops.add(handle);
  return handle;
}

export const isSoundOn = () => soundOn;

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
