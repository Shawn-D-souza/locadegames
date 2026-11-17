/**
 * The video's clock, standing in for the browser's in the app's own code (every file under src/web gets these in place
 * of the globals: `clockLoader.cjs`). Time moves only when the video does: a clip sets it from its frame
 * (`useVideoClock`), then the timers and animation frames due by then run, so a game's timers, its playback and its
 * `Date.now()` all follow the video, frame by frame, however long a frame takes to render.
 */

/** The video's 0:00 on `Date.now()`'s clock: an ordinary afternoon (the phones' status bars say 3:17). */
export const EPOCH_MS = Date.UTC(2026, 10, 17, 15, 17, 0);

let nowMs = EPOCH_MS;
let nextId = 1;
const timers = new Map<number, { at: number; fn: (...args: unknown[]) => void; args: unknown[]; every: number | null }>();
const frames = new Map<number, FrameRequestCallback>();

/** A moment of the video (seconds from 0:00) on `Date.now()`'s clock. */
export const videoMs = (seconds: number) => EPOCH_MS + Math.round(seconds * 1000);

function schedule(fn: unknown, ms: unknown, args: unknown[], every: boolean): number {
  const id = nextId++;
  const delay = Math.max(every ? 1 : 0, Number(ms) || 0);
  if (typeof fn === "function") timers.set(id, { at: nowMs + delay, fn: fn as (...a: unknown[]) => void, args, every: every ? delay : null });
  return id;
}

export const setTimeout = (fn: unknown, ms?: unknown, ...args: unknown[]) => schedule(fn, ms, args, false);
export const setInterval = (fn: unknown, ms?: unknown, ...args: unknown[]) => schedule(fn, ms, args, true);
export const clearTimeout = (id: unknown) => void timers.delete(Number(id));
export const clearInterval = clearTimeout;
export function requestAnimationFrame(fn: FrameRequestCallback): number {
  const id = nextId++;
  frames.set(id, fn);
  return id;
}
export const cancelAnimationFrame = (id: number) => void frames.delete(id);

export const performance = { now: () => nowMs - EPOCH_MS, timeOrigin: EPOCH_MS };

export class VideoDate extends globalThis.Date {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(nowMs);
    else super(...(args as [number]));
  }
  static override now() {
    return nowMs;
  }
}

/** Moves the clock on to `ms` (never back). */
export function setClockTime(ms: number) {
  if (ms > nowMs) nowMs = ms;
}

/** Runs every timer due by now, each at its own moment (an interval as often as it fell due). How many ran. */
export function runDueTimers(): number {
  const target = nowMs;
  let ran = 0;
  for (;;) {
    let next: number | null = null;
    for (const [id, t] of timers) if (t.at <= target && (next === null || t.at < timers.get(next)!.at)) next = id;
    if (next === null) break;
    const timer = timers.get(next)!;
    nowMs = timer.at;
    if (timer.every === null) timers.delete(next);
    else timer.at += timer.every;
    timer.fn(...timer.args);
    ran++;
  }
  nowMs = target;
  return ran;
}

/** One animation frame: every callback asked for so far, once (those asked for meanwhile wait for the next). */
export function runAnimationFrame() {
  const due = [...frames.values()];
  frames.clear();
  for (const fn of due) fn(performance.now());
}
