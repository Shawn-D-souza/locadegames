import { hapticTrigger } from "ios-haptics";
import { WebHaptics } from "web-haptics";
import { toVibrations, type HapticStep, type Pulse } from "../haptics/definition";
import { HAPTICS, pulsesOf, type HapticName } from "../haptics/hapticBook";
import { HAPTIC_OF_SOUND, hapticStepsOf } from "../haptics/soundHaptics";
import type { SoundName, SoundStep } from "../sound/soundBook";
import { loadHapticsOn, saveHapticsOn } from "./sessionStore";

/**
 * The app's one door to the phone's motor. Android browsers feel everything through web-haptics. iPhones only allow
 * a tick from a finger's real tap, so there `hapticTarget` on a button is all that happens: iOS ticks by itself, and
 * web-haptics stays out of it (its way of ticking from code was closed in iOS 26.5). See DESIGN.md, Haptics.
 */

export interface HapticHandle {
  stop(): void;
}

const NO_HANDLE: HapticHandle = { stop() {} };

/** Null on iPhones and any browser without a vibration call. */
const engine = WebHaptics.isSupported ? new WebHaptics() : null;
let hapticsOn = loadHapticsOn();
const listeners = new Set<() => void>();
/** The moment on the motor now, if it's a pattern: until it ends, single pulses don't cut it off. */
let current: object | null = null;
let patternEndsAt = 0;

const onIPhone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** This phone can feel something: there's no point in offering the switch on a computer, which has no motor. */
export const hapticsAvailable = () => onIPhone() || (engine !== null && window.matchMedia("(pointer: coarse)").matches);

/** On a button (`ref={hapticTarget}`): an iPhone ticks when it's tapped. Does nothing elsewhere. CSS turns it off when disabled or switched off. */
export const hapticTarget = hapticTrigger;

/** Development only: what was felt, in order, for playtests to check. */
function log(names: readonly HapticName[]) {
  if (import.meta.env.DEV) ((window as unknown as { hapticLog?: string[] }).hapticLog ??= []).push(...names);
}

function start(pulses: readonly Pulse[], names: readonly HapticName[]): HapticHandle {
  if (!hapticsOn || pulses.length === 0) return NO_HANDLE;
  const now = performance.now();
  if (pulses.length === 1 && now < patternEndsAt) return NO_HANDLE;
  log(names);
  // Chrome blocks (and complains about) vibrating before the first tap on the page, as after opening a shared link.
  if (!engine || navigator.userActivation?.hasBeenActive === false) return NO_HANDLE;
  const moment = {};
  current = moment;
  patternEndsAt = pulses.length > 1 ? now + pulses[pulses.length - 1]!.at : 0;
  void engine.trigger(toVibrations(pulses));
  return {
    stop() {
      if (current !== moment) return;
      current = null;
      patternEndsAt = 0;
      engine.cancel();
    },
  };
}

/** Plays a feel. Safe to call any time: with haptics off, or on a phone that can't, it just does nothing. */
export function playHaptic(name: HapticName): HapticHandle {
  return start(HAPTICS[name].pulses, [name]);
}

/** Plays feels at exact times, as one pattern (a new vibration would cut off the last). Stopping it stops what's left. */
export function playHapticSequence(steps: readonly HapticStep<HapticName>[]): HapticHandle {
  return start(pulsesOf(steps), steps.map((step) => step.haptic));
}

/** What `playSound` calls: what this sound feels like, if anything. */
export function feelSound(sound: SoundName) {
  const haptic = HAPTIC_OF_SOUND[sound];
  if (haptic) playHaptic(haptic);
}

/** What `playSoundSequence` calls: the same moment, felt. */
export function feelSoundSequence(steps: readonly SoundStep[]): HapticHandle {
  return playHapticSequence(hapticStepsOf(steps));
}

const markOnPage = () => {
  document.documentElement.dataset.haptics = hapticsOn ? "on" : "off";
};

/** Call once at startup. */
export const installHaptics = markOnPage;

export const isHapticsOn = () => hapticsOn;

export function setHapticsOn(on: boolean) {
  if (!on && performance.now() < patternEndsAt) engine?.cancel();
  hapticsOn = on;
  saveHapticsOn(on);
  markOnPage();
  for (const listener of listeners) listener();
}

export function subscribeHapticsOn(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
