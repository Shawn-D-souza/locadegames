import { clsx } from "clsx";
import { useEffect, useLayoutEffect, useRef } from "react";
import { sideFrame, type Point } from "../../../shared/games/carrom/board";
import type { CarromSide } from "../../../shared/games/carrom/types";
import { useElementSize } from "../../hooks/useElementSize";
import { boardTransform, fitView, screenDirection, toBoard, toScreen, viewSize } from "./boardView";
import { drawBoard, drawDiscs, drawPullBand, type DrawDisc } from "./drawBoard";
import type { Sling } from "./strikerGrip";
import type { BoardControl } from "./useStrikerControl";

interface CarromBoardProps {
  discs: readonly DrawDisc[];
  /** The striker's color now: yours while you aim, the shooter's during a shot. */
  strikerColor: string;
  /** Your striker while it's your shot (for playtests: where it is on screen). */
  striker: Point | null;
  /** Only while you pull your striker back: the band behind it shows how. */
  pull: Sling | null;
  /** Your side: the board turns so it's at the bottom. */
  side: CarromSide;
  /** Your shot: what a finger on the screen does (slide the striker, aim, pull back). */
  control?: BoardControl;
  /** For screen readers: everyone's points. */
  label: string;
}

/**
 * The board on a canvas, square, as big as the room it's given allows, turned so your side is at the bottom: the frame,
 * the lines, the holes, every coin and the striker. While it's your shot, a finger anywhere on the screen works the
 * striker (`useStrikerControl`; the corner button and popups keep their touches). For playtests the canvas carries the
 * striker's place on screen, the ways forward and along your baseline run, and how hard it's pulled back right now
 * (`data-striker`, `data-forward`, `data-right`, `data-pull`).
 */
export function CarromBoard({ discs, strikerColor, striker, pull, side, control, label }: CarromBoardProps) {
  const [roomRef, room] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = fitView(room.width, room.height, side);
  const size = viewSize(view);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || view.scale <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pixels = Math.round(size * dpr);
    if (canvas.width !== pixels) canvas.width = pixels;
    if (canvas.height !== pixels) canvas.height = pixels;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixels, pixels);
    ctx.setTransform(...boardTransform(view, dpr));
    const px = 1 / view.scale;
    drawBoard(ctx, px);
    if (striker && pull) drawPullBand(ctx, striker, pull.aim, pull.power, strikerColor);
    drawDiscs(ctx, discs, strikerColor, px);
  });

  // A finger anywhere on the screen takes part in your shot: followed through the window, with the latest control and
  // view (they change every render, the finger doesn't).
  const latest = useRef({ control, view });
  useLayoutEffect(() => {
    latest.current = { control, view };
  });
  const enabled = control !== undefined;
  useEffect(() => {
    if (!enabled) return;
    let finger: number | null = null;
    const at = (event: PointerEvent) => {
      const box = canvasRef.current!.getBoundingClientRect();
      return toBoard(latest.current.view, event.clientX - box.left, event.clientY - box.top);
    };
    // The corner button and any popup keep their own touches.
    const ownTouch = (event: PointerEvent) => event.target instanceof Element && event.target.closest("button, a, input") !== null;
    const down = (event: PointerEvent) => {
      if (finger !== null || ownTouch(event) || document.querySelector('[role="dialog"]')) return;
      finger = event.pointerId;
      latest.current.control?.down(at(event));
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId === finger) latest.current.control?.move(at(event));
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== finger) return;
      finger = null;
      latest.current.control?.up(at(event));
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== finger) return;
      finger = null;
      latest.current.control?.cancel();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      latest.current.control?.cancel();
    };
  }, [enabled]);

  const strikerAt = striker && toScreen(view, striker.x, striker.y);
  const { forward: ahead, right: along } = sideFrame(side);
  const forward = screenDirection(view, ahead.x, ahead.y);
  const right = screenDirection(view, along.x, along.y);

  return (
    <div ref={roomRef} className={clsx("relative min-h-0 w-full flex-1", control && "cursor-grab")}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="absolute top-1/2 left-1/2 -translate-1/2"
        style={{ width: size, height: size }}
        data-striker={strikerAt ? `${strikerAt.x},${strikerAt.y}` : undefined}
        data-forward={`${forward.x},${forward.y}`}
        data-pull={striker && pull ? pull.power : undefined}
        data-right={`${right.x},${right.y}`}
      />
    </div>
  );
}
