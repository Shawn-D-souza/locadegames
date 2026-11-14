import { clsx } from "clsx";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import { drawBalls, drawCue, drawTable, type DrawBall, type DrawCue } from "./drawTable";
import { fitView, screenDirection, tableTransform, toScreen, toTable, viewSize } from "./tableView";
import type { TableControl } from "./useCueControl";

interface PoolTableProps {
  balls: readonly DrawBall[];
  cue: DrawCue | null;
  /** Lying along the screen's long side: standing up in portrait. */
  portrait: boolean;
  /** Your shot: what a finger on the table does (aim, or take hold of the cue and pull it back). */
  control?: TableControl;
  /** For screen readers: who has how many balls left. */
  label: string;
}

/**
 * The table on a canvas, as big as the room it is given allows: the rail, cloth, pockets and every ball; the cue on a
 * layer over the whole screen, so it reaches past the table's edge, on top of everything (touches pass through it). While
 * it's your shot, a finger anywhere on the screen aims and shoots (`useCueControl`; the corner button and popups keep their touches). The cue's place on screen is on the canvas as data
 * (`data-cue`, `data-back`: the cue ball's middle and the way back along the stick), for playtests.
 */
export function PoolTable({ balls, cue, portrait, control, label }: PoolTableProps) {
  const [roomRef, room] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLCanvasElement>(null);
  const view = fitView(room.width, room.height, portrait);
  const size = viewSize(view);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || view.scale <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(size.width * dpr);
    const h = Math.round(size.height * dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(...tableTransform(view, dpr));
    const px = 1 / view.scale;
    drawTable(ctx, px);
    drawBalls(ctx, balls, px);

    // The cue on its own layer over the whole screen (owner direction: always on top, never cut off at the table's edge).
    const layer = cueRef.current;
    const cueCtx = layer?.getContext("2d");
    if (!layer || !cueCtx) return;
    const lw = Math.round(window.innerWidth * dpr);
    const lh = Math.round(window.innerHeight * dpr);
    if (layer.width !== lw) layer.width = lw;
    if (layer.height !== lh) layer.height = lh;
    cueCtx.setTransform(1, 0, 0, 1, 0, 0);
    cueCtx.clearRect(0, 0, lw, lh);
    if (!cue) return;
    const box = canvas.getBoundingClientRect();
    const [a, b, c, d, e, f] = tableTransform(view, dpr);
    cueCtx.setTransform(a, b, c, d, e + box.left * dpr, f + box.top * dpr);
    drawCue(cueCtx, cue, px);
  });

  // A finger anywhere on the screen takes part in your shot (owner direction: a long press outside the table works
  // too): followed through the window, with the latest control and view (they change every render, the finger doesn't).
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
      return toTable(latest.current.view, event.clientX - box.left, event.clientY - box.top);
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
  const cueAt = cue && toScreen(view, cue.x, cue.y);
  const back = cue && screenDirection(view, -cue.dx, -cue.dy);

  return (
    <div ref={roomRef} className={clsx("relative min-h-0 w-full flex-1", control && "cursor-grab")}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="absolute top-1/2 left-1/2 -translate-1/2"
        style={{ width: size.width, height: size.height }}
        data-cue={cueAt ? `${cueAt.x},${cueAt.y}` : undefined}
        data-back={back ? `${back.x},${back.y}` : undefined}
      />
      <canvas ref={cueRef} className="pointer-events-none fixed inset-0 z-raised size-full" aria-hidden="true" />
    </div>
  );
}
