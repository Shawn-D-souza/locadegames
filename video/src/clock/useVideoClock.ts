import { useLayoutEffect, useRef } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { syncAnimations } from "../parts/useFrameAnimations";
import { runAnimationFrame, runDueTimers, setClockTime, videoMs } from "./clock";

/** A real turn of the browser's event loop: React renders what the timers changed. */
const settle = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

/**
 * Runs the app's clock with the video: called first thing in a clip's screen, whose frame 0 is the video's frame
 * `from`. Before the screen renders, `Date.now()` is this frame's moment; then one animation frame and every timer due
 * run, and the frame is held until React has drawn what they changed (and any timers that set off). `warp` fits a
 * moment to the music: the app's time (seconds) at a moment of the video, if it runs at another pace there (Dots
 * Clash's chain, a wave a beat).
 */
export function useVideoClock(from: number, warp: (seconds: number) => number = (s) => s) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  setClockTime(videoMs(warp((from + frame) / fps)));
  const done = useRef(-1);
  useLayoutEffect(() => {
    if (done.current === frame) return;
    done.current = frame;
    const handle = delayRender(`video clock, frame ${frame}`);
    void (async () => {
      runAnimationFrame();
      for (let quiet = 0; quiet < 3; ) {
        await settle();
        quiet = runDueTimers() === 0 ? quiet + 1 : 0;
      }
      syncAnimations(frame, fps);
      continueRender(handle);
    })();
  });
}
