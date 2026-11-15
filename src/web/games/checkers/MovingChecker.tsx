import { useLayoutEffect, useRef, type ReactNode } from "react";
import { durations, transforms } from "../../../theme";
import type { Point } from "./view";

const translateOf = (point: Point) => `${point.x * 100}% ${point.y * 100}%`;

interface MovingCheckerProps {
  /** Where it goes, in order: it starts on the first point and slides to each in turn, a hop each (a jump grows as it goes over). One point: it sits there. */
  route: readonly Point[];
  children: ReactNode;
}

/**
 * The piece that is moving, over the board's squares: one square's size, sliding from square to square along its
 * route. Remount it (a new `key`) for each new route.
 */
export function MovingChecker({ route, children }: MovingCheckerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const end = route[route.length - 1]!;
  const path = route.map(translateOf).join();
  useLayoutEffect(() => {
    if (route.length < 2 || !ref.current?.animate) return;
    const frames: Keyframe[] = [];
    route.forEach((point, i) => {
      const previous = route[i - 1];
      if (previous && Math.abs(point.x - previous.x) > 1.5) {
        const middle = { x: (point.x + previous.x) / 2, y: (point.y + previous.y) / 2 };
        frames.push({ translate: translateOf(middle), scale: String(transforms.checkerJumpLift), offset: (i - 0.5) / (route.length - 1) });
      }
      frames.push({ translate: translateOf(point), scale: "1", offset: i / (route.length - 1) });
    });
    ref.current.animate(frames, { duration: (route.length - 1) * durations.checkerHop });
    // The route is read from its points, which `path` stands for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return (
    <span ref={ref} className="pointer-events-none absolute top-0 left-0 size-1/8" style={{ translate: translateOf(end) }} aria-hidden="true">
      {children}
    </span>
  );
}
