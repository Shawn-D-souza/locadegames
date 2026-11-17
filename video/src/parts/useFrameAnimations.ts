import { useLayoutEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/** When each animation was first seen, in video frames. */
const born = new WeakMap<Animation, number>();

/**
 * Puts every CSS animation on the page where it is at `frame`: paused, and as far in as it has existed (in frames).
 * Needs the frames rendered in order in one tab (screens are rendered with concurrency 1), so "since it appeared" is the
 * frame it was first seen.
 */
export function syncAnimations(frame: number, fps: number) {
  for (const animation of document.getAnimations()) {
    let start = born.get(animation);
    if (start === undefined) {
      start = frame;
      born.set(animation, start);
    }
    animation.pause();
    animation.currentTime = ((frame - start) / fps) * 1000;
  }
}

/**
 * Plays the app's own CSS animations (a player bar popping in, a countdown number) on the video's clock instead of the
 * wall clock.
 */
export function useFrameAnimations() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  useLayoutEffect(() => syncAnimations(frame, fps));
}
